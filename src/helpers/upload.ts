import path from "path";
import { supabase, BUCKET_NAMES } from "~/config/supabase.config";
import { generateUniqueSlug } from "~/utils/slug.util";

const BUCKET_NAME = BUCKET_NAMES.PRODUCTS;

export interface UploadResult {
    publicUrl: string;
    path: string;
}

export const uploadProductImage = async (
    file: Express.Multer.File,
    folderName: string  // folderName thường là slug của sản phẩm
): Promise<UploadResult> => {
    if (!file) {
        throw new Error("File is required");
    }

    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || ".jpg";
    const fileName = `${timestamp}-${Math.round(Math.random() * 1E9)}${ext}`;
    const filePath = `${folderName}/${fileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data?.path || filePath);

    return {
        publicUrl: publicData.publicUrl,
        path: data?.path || filePath
    };
};

export const removeProductImage = async (storagePath: string): Promise<void> => {
    if (!storagePath) return;
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
};

// Xóa toàn bộ folder sản phẩm
export const removeProductFolder = async (folderName: string): Promise<void> => {
    if (!folderName) return;
    
    // List all files in folder
    const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderName);
        
    if (listError || !files || files.length === 0) return;
    
    // Delete all files
    const filesToRemove = files.map(file => `${folderName}/${file.name}`);
    await supabase.storage.from(BUCKET_NAME).remove(filesToRemove);
};
