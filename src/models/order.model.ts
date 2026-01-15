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
  },
  reviewed: {
    type: Boolean,
    default: false
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

    
    shipping_address: {
      full_name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      ward: String,
      district: String,
      province: String,
    },

    payment: {
      method: {
        type: String,
        enum: ["COD", "MOMO", "VNPAY"],
        required: true
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
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
