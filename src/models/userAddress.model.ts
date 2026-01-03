import mongoose from "mongoose";

const userAddressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    full_name: String,
    phone: String,
    address: String,
    ward: String,
    district: String,
    province: String,

    is_default: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserAddress = mongoose.model("UserAddress", userAddressSchema);

export default UserAddress;
