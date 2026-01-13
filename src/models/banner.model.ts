import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  link: String,
  slug: { type: String, unique: true, trim: true }, 
  position: {
    type: String,
    enum: ["HOME_TOP", "HOME_MIDDLE", "CATEGORY"],
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Banner = mongoose.model("Banner", BannerSchema);

export default Banner;