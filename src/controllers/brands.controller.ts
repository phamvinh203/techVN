import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Brand from "~/models/brand.model";
import { generateSlug } from "~/utils/slug.util";

// Lấy tất cả brands
export const getAllBrands = async (req: Request, res: Response): Promise<void> => {
    try {
        const brands = await Brand.find();
        sendSuccess(res, {
            success: true,
            data: brands,
        });
    } catch (error) {
        console.error("Get all brands error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Lấy brand theo ID
export const getBrandById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const brand = await Brand.findById(id);
        
        if (!brand) {
            sendError(res, 404, "Không tìm thấy thương hiệu");
            return;
        }

        sendSuccess(res, {
            success: true,
            data: brand,
        });
    } catch (error) {
        console.error("Get brand by ID error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Tạo brand mới
export const createBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, logo, slug } = req.body;

        if (!name) {
            sendError(res, 400, "Tên thương hiệu là bắt buộc");
            return;
        }

        // Kiểm tra brand đã tồn tại
        const existingBrand = await Brand.findOne({ name });
        if (existingBrand) {
            sendError(res, 400, "Thương hiệu đã tồn tại");
            return;
        }

        // Tạo slug từ name nếu không cung cấp
        const brandSlug = slug || generateSlug(name);

        // Kiểm tra slug đã tồn tại
        const existingSlug = await Brand.findOne({ slug: brandSlug });
        if (existingSlug) {
            sendError(res, 400, "Slug đã tồn tại");
            return;
        }

        const newBrand = await Brand.create({
            name,
            slug: brandSlug,
            logo,
        });

        sendSuccess(res, {
            success: true,
            message: "Tạo thương hiệu thành công",
            data: newBrand,
        });
    } catch (error) {
        console.error("Create brand error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Cập nhật brand
export const updateBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, logo, slug } = req.body;

        const brand = await Brand.findById(id);
        if (!brand) {
            sendError(res, 404, "Không tìm thấy thương hiệu");
            return;
        }

        // Kiểm tra tên brand đã tồn tại (nếu có thay đổi)
        if (name && name !== brand.name) {
            const existingBrand = await Brand.findOne({ name });
            if (existingBrand) {
                sendError(res, 400, "Tên thương hiệu đã tồn tại");
                return;
            }
        }

        // Kiểm tra slug đã tồn tại (nếu có thay đổi)
        if (slug && slug !== brand.slug) {
            const existingSlug = await Brand.findOne({ slug });
            if (existingSlug) {
                sendError(res, 400, "Slug đã tồn tại");
                return;
            }
        }

        // Tự động cập nhật slug nếu name thay đổi và không cung cấp slug mới
        const updateData: any = { name, logo };
        if (slug) {
            updateData.slug = slug;
        } else if (name && name !== brand.name) {
            updateData.slug = generateSlug(name);
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        sendSuccess(res, {
            success: true,
            message: "Cập nhật thương hiệu thành công",
            data: updatedBrand,
        });
    } catch (error) {
        console.error("Update brand error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Xóa brand
export const deleteBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const brand = await Brand.findById(id);
        if (!brand) {
            sendError(res, 404, "Không tìm thấy thương hiệu");
            return;
        }

        await Brand.findByIdAndDelete(id);

        sendSuccess(res, {
            success: true,
            message: "Xóa thương hiệu thành công",
        });
    } catch (error) {
        console.error("Delete brand error:", error);
        sendError(res, 500, "Lỗi server");
    }
};
