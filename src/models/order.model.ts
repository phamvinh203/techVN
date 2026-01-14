import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    order_code: {
      type: String,
      unique: true,
      required: true
    },

    items: [orderItemSchema],

    // SỬA CHỖ NÀY
    shipping_address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAddress",
      required: true
    },

    payment_method: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true
    },

    order_status: {
      type: String,
      enum: ["pending", "confirmed", "shipping", "delivered", "cancelled"],
      default: "pending"
    },

    total_amount: {
      type: Number,
      required: true,
      min: 0
    },

    shipping_fee: {
      type: Number,
      default: 0
    },

    final_amount: {
      type: Number,
      required: true,
      min: 0
    },

    notes: String,

    cancelled_at: Date,
    cancelled_reason: String,
    delivered_at: Date
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
