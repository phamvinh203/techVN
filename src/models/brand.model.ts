import mongoose from "mongoose";

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, trim: true },
  logo: String,
});

const Brand = mongoose.model("Brand", BrandSchema);

export default Brand;
