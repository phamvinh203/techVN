import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Banner from "~/models/banner.model";

// Lấy tất cả banners
export const getAllBanners = async (req: Request, res: Response): Promise<void> => {
    try {
        const { position, isActive } = req.query;
        
        // Build query filter
        const filter: any = {};
        if (position) filter.position = position;
        if (isActive !== undefined) filter.isActive = isActive === "true";

        const banners = await Banner.find(filter).sort({ createdAt: -1 });
        sendSuccess(res, {
            success: true,
            data: banners,
        });
    } catch (error) {
        console.error("Get all banners error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Lấy banners đang hoạt động (public API)
export const getActiveBanners = async (req: Request, res: Response): Promise<void> => {
    try {
        const { position } = req.query;
        
        const filter: any = { isActive: true };
        if (position) filter.position = position;

        const banners = await Banner.find(filter).sort({ createdAt: -1 });
        sendSuccess(res, {
            success: true,
            data: banners,
        });
    } catch (error) {
        console.error("Get active banners error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Lấy banner theo ID
export const getBannerById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);
        
        if (!banner) {
            sendError(res, 404, "Không tìm thấy banner");
            return;
        }

        sendSuccess(res, {
            success: true,
            data: banner,
        });
    } catch (error) {
        console.error("Get banner by ID error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Tạo banner mới
export const createBanner = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, imageUrl, link, position, isActive } = req.body;

        if (!imageUrl) {
            sendError(res, 400, "URL hình ảnh là bắt buộc");
            return;
        }

        // Validate position
        const validPositions = ["HOME_TOP", "HOME_MIDDLE", "CATEGORY"];
        if (position && !validPositions.includes(position)) {
            sendError(res, 400, "Vị trí banner không hợp lệ");
            return;
        }

        const newBanner = await Banner.create({
            title,
            imageUrl,
            link,
            position,
            isActive: isActive !== undefined ? isActive : true,
        });

        sendSuccess(res, {
            success: true,
            message: "Tạo banner thành công",
            data: newBanner,
        });
    } catch (error) {
        console.error("Create banner error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Cập nhật banner
export const updateBanner = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, imageUrl, link, position, isActive } = req.body;

        const banner = await Banner.findById(id);
        if (!banner) {
            sendError(res, 404, "Không tìm thấy banner");
            return;
        }

        // Validate position nếu có
        const validPositions = ["HOME_TOP", "HOME_MIDDLE", "CATEGORY"];
        if (position && !validPositions.includes(position)) {
            sendError(res, 400, "Vị trí banner không hợp lệ");
            return;
        }

        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            { title, imageUrl, link, position, isActive },
            { new: true }
        );

        sendSuccess(res, {
            success: true,
            message: "Cập nhật banner thành công",
            data: updatedBanner,
        });
    } catch (error) {
        console.error("Update banner error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Toggle trạng thái banner (active/inactive)
export const toggleBannerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);
        if (!banner) {
            sendError(res, 404, "Không tìm thấy banner");
            return;
        }

        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            { isActive: !banner.isActive },
            { new: true }
        );

        sendSuccess(res, {
            success: true,
            message: `Banner đã được ${updatedBanner?.isActive ? "kích hoạt" : "vô hiệu hóa"}`,
            data: updatedBanner,
        });
    } catch (error) {
        console.error("Toggle banner status error:", error);
        sendError(res, 500, "Lỗi server");
    }
};

// Xóa banner
export const deleteBanner = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);
        if (!banner) {
            sendError(res, 404, "Không tìm thấy banner");
            return;
        }

        await Banner.findByIdAndDelete(id);

        sendSuccess(res, {
            success: true,
            message: "Xóa banner thành công",
        });
    } catch (error) {
        console.error("Delete banner error:", error);
        sendError(res, 500, "Lỗi server");
    }
};
