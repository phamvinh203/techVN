import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Category from "~/models/category.model";
import Product from "~/models/product.model";
import { generateSlug } from "~/utils/slug.util";

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

// Lấy category theo slug và các sản phẩm thuộc category
export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
        const { slug } = req.params;
        const category = await Category.findOne({ slug });
        
        if (!category) {
            sendError(res, 404, "Không tìm thấy danh mục");
            return;
        }

        // Lấy các sản phẩm thuộc category này
        const products = await Product.find({ 
            category_id: category._id,
            deleted: false,
            status: "active"
        }).populate("brand_id");

        sendSuccess(res, {
            success: true,
            data: {
                category,
                products
            },
        });
    } catch (error) {
        console.error("Get category by slug error:", error);
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

        // Tạo slug từ name nếu không cung cấp
        const categorySlug = slug || generateSlug(name);

        // Kiểm tra slug đã tồn tại
        const existingCategory = await Category.findOne({ slug: categorySlug });
        if (existingCategory) {
            sendError(res, 400, "Slug đã tồn tại");
            return;
        }

        const newCategory = await Category.create({
            name,
            slug: categorySlug,
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

        // Tự động cập nhật slug nếu name thay đổi và không cung cấp slug mới
        const updateData: any = { name };
        if (slug) {
            updateData.slug = slug;
        } else if (name && name !== category.name) {
            updateData.slug = generateSlug(name);
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
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
