import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    // order_id: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Order",
    //   required: true
    // },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    comment: {
      type: String,
      trim: true
    },

    // images: {
    //   type: [String],
    //   default: []
    // },

    admin_reply: {
      content: { type: String },
      replied_at: { type: Date },
      admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },

    is_hidden: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/**
 *  Chặn review trùng:
 * 1 user + 1 product + 1 order → chỉ 1 review
 */
reviewSchema.index(
/*  { user_id: 1, product_id: 1, order_id: 1 },*/ 
  { user_id: 1, product_id: 1 },
  { unique: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
