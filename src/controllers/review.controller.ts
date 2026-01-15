import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import {
  createReviewService,
  getProductReviewsService,
  adminReplyReviewService,
  getAllReviewsAdminService,
  toggleHideReviewService
} from "../services/review.service";

// POST /reviews
export const createReview = async (
  req: Request & { user?: any },
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const { product_id, rating, comment } = req.body;

    if (!userId) {
      sendError(res, 401, "Unauthorized");
      return;
    }

    if (!product_id || !rating) {
      sendError(res, 400, "Thiếu dữ liệu bắt buộc");
      return;
    }

    const review = await createReviewService({
      userId,
      product_id,
      rating,
      comment
    });

    sendSuccess(res, {
      message: "Đánh giá sản phẩm thành công",
      data: review
    });
  } catch (error: any) {
    console.error("createReview error:", error);
    sendError(res, 400, error.message || "Không thể tạo đánh giá");
  }
};

// GET /products/:id/reviews
export const getProductReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const data = await getProductReviewsService(id, page, limit);

    sendSuccess(res, data);
  } catch (error) {
    console.error("getProductReviews error:", error);
    sendError(res, 500, "Lỗi server");
  }
};

// ADMIN reply review
export const adminReplyReview = async (
  req: Request & { user?: any },
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.user_id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      sendError(res, 400, "Nội dung phản hồi là bắt buộc");
      return;
    }

    const review = await adminReplyReviewService({
      reviewId: id,
      adminId,
      content
    });

    sendSuccess(res, {
      message: "Phản hồi review thành công",
      data: review
    });
  } catch (error: any) {
    console.error("adminReplyReview error:", error);
    sendError(res, 400, error.message || "Không thể phản hồi review");
  }
};

/**
 * GET /reviews/admin/all
 * Admin: Lấy tất cả reviews với filter
 * Query params:
 *  - page: số trang (default: 1)
 *  - limit: số item/trang (default: 10)
 *  - rating: lọc theo rating (1-5)
 *  - is_hidden: lọc theo trạng thái ẩn (true/false)
 *  - has_reply: lọc theo đã reply chưa (true/false)
 *  - sort_by: field để sort (default: createdAt)
 *  - sort_order: asc/desc (default: desc)
 */
export const getAllReviewsAdmin = async (
  req: Request & { user?: any },
  res: Response
): Promise<void> => {
  try {
    const {
      page,
      limit,
      rating,
      is_hidden,
      has_reply,
      sort_by,
      sort_order
    } = req.query;

    const data = await getAllReviewsAdminService({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      rating: rating ? Number(rating) : undefined,
      is_hidden: is_hidden !== undefined ? is_hidden === "true" : undefined,
      has_reply: has_reply !== undefined ? has_reply === "true" : undefined,
      sort_by: sort_by as string,
      sort_order: sort_order as "asc" | "desc"
    });

    sendSuccess(res, data);
  } catch (error: any) {
    console.error("getAllReviewsAdmin error:", error);
    sendError(res, 500, error.message || "Lỗi server");
  }
};

/**
 * PATCH /reviews/admin/:id/toggle-hide
 * Admin: Toggle ẩn/hiện review
 */
export const toggleHideReview = async (
  req: Request & { user?: any },
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await toggleHideReviewService(id);

    sendSuccess(res, {
      message: review.is_hidden
        ? "Đã ẩn review thành công"
        : "Đã hiện review thành công",
      data: review
    });
  } catch (error: any) {
    console.error("toggleHideReview error:", error);
    sendError(res, 400, error.message || "Không thể thay đổi trạng thái review");
  }
};
