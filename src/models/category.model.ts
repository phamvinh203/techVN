import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
});

const Category = mongoose.model("Category", CategorySchema);

export default Category;
