import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["COD", "MOMO", "VNPAY"],
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending"
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Mã giao dịch từ cổng thanh toán
  transaction_id: {
    type: String
  },

  // Dữ liệu raw callback từ cổng thanh toán
  provider_response: {
    type: mongoose.Schema.Types.Mixed
  },

  paid_at: {
    type: Date
  }

}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
