import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },

  description: String,
  thumbnail: String,

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },

  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },

  variants: [
    {
      sku: { type: String, required: true },
      price: Number,
      stock: Number,

      specifications: {
        cpu: String,
        ram: String,
        storage: String,
        gpu: String,

        display: String,
        operatingSystem: String,

        battery: String,
        camera: String,

        ports: String,
        wireless: String,

        dimensions: String,
        weight: String,

        color: String,
        material: String,

        condition: String,
        releaseYear: Number,
        warranty: String,
        origin: String,
      },
    },
  ],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model("Product", ProductSchema);

export default Product;