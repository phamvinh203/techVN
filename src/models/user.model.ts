import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false, 
    },

    phone: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },

    birthday: {
      type: Date,
    },

    address: [{
      type: String,
      trim: true
    }],

    avatar: {
      type: String,
    },

    isRole: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },

    refresh_token: {
      type: String,
      select: false,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },

    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },

  },
  { timestamps: true }
);

const Auth = mongoose.model("User", userSchema);

export default Auth;
