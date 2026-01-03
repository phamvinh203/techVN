import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Category from "~/models/category.model";

// Lấy tất cả categories
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find();
        sendSuccess(res, {
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("Get all categories error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Lấy category theo ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        
        if (!category) {
            sendError(res, 404, "Không tìm thấy danh mục");
            return;
        }

        sendSuccess(res, {
            success: true,
            data: category,
        });
    } catch (error) {
        console.error("Get category by ID error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Tạo category mới
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, slug } = req.body;

        if (!name) {
            sendError(res, 400, "Tên danh mục là bắt buộc");
            return;
        }

        // Kiểm tra slug đã tồn tại
        if (slug) {
            const existingCategory = await Category.findOne({ slug });
            if (existingCategory) {
                sendError(res, 400, "Slug đã tồn tại");
                return;
            }
        }

        const newCategory = await Category.create({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        });

        sendSuccess(res, {
            success: true,
            message: "Tạo danh mục thành công",
            data: newCategory,
        });
    } catch (error) {
        console.error("Create category error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Cập nhật category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, slug } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            sendError(res, 404, "Không tìm thấy danh mục");
            return;
        }

        // Kiểm tra slug đã tồn tại (nếu có thay đổi)
        if (slug && slug !== category.slug) {
            const existingCategory = await Category.findOne({ slug });
            if (existingCategory) {
                sendError(res, 400, "Slug đã tồn tại");
                return;
            }
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, slug },
            { new: true }
        );

        sendSuccess(res, {
            success: true,
            message: "Cập nhật danh mục thành công",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Update category error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Xóa category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            sendError(res, 404, "Không tìm thấy danh mục");
            return;
        }

        await Category.findByIdAndDelete(id);

        sendSuccess(res, {
            success: true,
            message: "Xóa danh mục thành công",
        });
    } catch (error) {
        console.error("Delete category error:", error);
        sendError(res, 500, "Lỗi server");
    }
};
