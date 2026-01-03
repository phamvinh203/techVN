import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
 name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    slug: {
      type: String,
      unique: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    oldprice: {
      type: Number,
      min: 0
    },

    images: [{
       type: String,
       trim: true
    }],

    description: {
      type: String,
      trim: true
    },

    specification: {
      type: mongoose.Schema.Types.Mixed
    },

    buyturn: {
      type: Number,
      default: 0,
      min: 0
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0
    },

    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand"
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model("Product", ProductSchema);

export default Product;

