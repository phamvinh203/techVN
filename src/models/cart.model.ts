import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  variant: {
    color: String,
    size: String
  },
  added_at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

cartSchema.pre('save', function () {
  this.updated_at = new Date();
});

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
