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
  variant: {
    color: String,
    size: String
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: true });

const shippingAddressSchema = new mongoose.Schema({
  recipient_name: {
    type: String,
    required: true
  },
  recipient_phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: String,
  district: String,
  ward: String
}, { _id: false });

const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["COD"],
    default: "COD"
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
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
    type: shippingAddressSchema,
    required: true
  },
  payment_method: {
    type: paymentMethodSchema,
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
    default: 0,
    min: 0
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
}, {
  timestamps: true
});

// Index for faster queries
orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ order_status: 1, createdAt: -1 });
orderSchema.index({ order_code: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
