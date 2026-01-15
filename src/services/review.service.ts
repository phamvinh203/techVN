import Review from "../models/review.model";
import mongoose from "mongoose";
import Product from "~/models/product.model";

export const createReviewService = async ({
  userId,
  product_id,
  rating,
  comment,
}: {
  userId: string;
  product_id: string;
  rating: number;
  comment?: string;
}) => {

const product = await Product.findById(product_id);
  if (!product) {
    throw new Error("Sản phẩm không tồn tại");
  }

  // Kiểm tra user đã review sản phẩm này chưa
  const existingReview = await Review.findOne({
    user_id: userId,
    product_id
  });

  if (existingReview) {
    throw new Error("Bạn đã đánh giá sản phẩm này rồi");
  }

  // Tạo review
  const review = await Review.create({
    user_id: userId,
    product_id,
    rating,
    comment
  });

  return review;
};

export const getProductReviewsService = async (
  productId: string,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({
      product_id: productId,
      is_hidden: false
    })
      .populate("user_id", "full_name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Review.countDocuments({
      product_id: productId,
      is_hidden: false
    })
  ]);

  // Tính rating trung bình
  const avgRatingResult = await Review.aggregate([
    {
      $match: {
        product_id: new mongoose.Types.ObjectId(productId),
        is_hidden: false
      }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const stats = avgRatingResult[0] || { avgRating: 0, totalReviews: 0 };

  return {
    reviews,
    stats: {
      avgRating: Math.round(stats.avgRating * 10) / 10,
      totalReviews: stats.totalReviews
    },
    pagination: {
      totalItems: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    }
  };
};

export const adminReplyReviewService = async ({
  reviewId,
  adminId,
  content
}: {
  reviewId: string;
  adminId: string;
  content: string;
}) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new Error("Review không tồn tại");
  }

  review.admin_reply = {
    content: content.trim(),
    replied_at: new Date(),
    admin_id: new mongoose.Types.ObjectId(adminId)
  };

  await review.save();

  return review;
};

/**
 * Admin: Lấy tất cả reviews với filter và pagination
 */
export const getAllReviewsAdminService = async ({
  page = 1,
  limit = 10,
  rating,
  is_hidden,
  has_reply,
  sort_by = "createdAt",
  sort_order = "desc"
}: {
  page?: number;
  limit?: number;
  rating?: number;
  is_hidden?: boolean;
  has_reply?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}) => {
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};

  if (rating !== undefined) {
    filter.rating = rating;
  }

  if (is_hidden !== undefined) {
    filter.is_hidden = is_hidden;
  }

  if (has_reply !== undefined) {
    if (has_reply) {
      filter["admin_reply.content"] = { $exists: true, $ne: null };
    } else {
      filter.$or = [
        { admin_reply: { $exists: false } },
        { "admin_reply.content": { $exists: false } },
        { "admin_reply.content": null }
      ];
    }
  }

  // Build sort
  const sortOptions: any = {};
  sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user_id", "full_name email avatar")
      .populate("product_id", "name images")
      .populate("admin_reply.admin_id", "full_name")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit),

    Review.countDocuments(filter)
  ]);

  return {
    reviews,
    pagination: {
      totalItems: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    }
  };
};

/**
 * Admin: Toggle ẩn/hiện review
 */
export const toggleHideReviewService = async (reviewId: string) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new Error("Review không tồn tại");
  }

  review.is_hidden = !review.is_hidden;
  await review.save();

  return review;
};