import multer from "multer";
import { Request } from "express";

// Cấu hình multer lưu vào memory (buffer)
const storage = multer.memoryStorage();

// Filter chỉ cho phép ảnh
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)"));
    }
};

export const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,  // 5MB
    },
}).single("avatar");  // Field name là "avatar"


// Middleware cho upload ảnh sản phẩm
export const uploadProductImageMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB
    },
}).array("images", 10);  // Nhận mảng ảnh với key "images", tối đa 10 ảnh

// Middleware xử lý lỗi multer
export const handleMulterError = (err: any, req: Request, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File quá lớn, tối đa 10MB" });
        }
        return res.status(400).json({ message: err.message });
    }
    
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    
    next();
};