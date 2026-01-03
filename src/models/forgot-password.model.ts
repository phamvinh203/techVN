// models/forgot_password.model.ts
import mongoose from "mongoose";

const forgotPasswordSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expireAt: {
            type: Date,
            expires: 0,  // TTL index - tự động xóa khi hết hạn
        },
    },
    {
        timestamps: true,
    }
);

const ForgotPassword = mongoose.model("ForgotPassword", forgotPasswordSchema, "forgot_password");

export default ForgotPassword;