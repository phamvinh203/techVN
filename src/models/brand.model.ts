import mongoose from "mongoose";

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: String,
});

const Brand = mongoose.model("Brand", BrandSchema);

export default Brand;
