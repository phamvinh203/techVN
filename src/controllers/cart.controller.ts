import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Cart from "~/models/cart.model";
import Product from "~/models/product.model";

// Xem giỏ hàng
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        let cart = await Cart.findOne({ user_id: userId })
            .populate("items.product_id", "name images price oldprice status deleted");

        if (!cart || cart.items.length === 0) {
            sendSuccess(res, {
                message: "Giỏ hàng trống",
                data: {
                    items: [],
                    total_items: 0,
                    total_amount: 0
                }
            });
            return;
        }

        // Filter out invalid items (product deleted or inactive)
        const validItems = cart.items.filter((item: any) => {
            return item.product_id &&
                   item.product_id.status === "active" &&
                   !item.product_id.deleted;
        });

        // If any items were filtered out, update the cart
        if (validItems.length !== cart.items.length) {
            (cart as any).items = validItems;
            await cart.save();
        }

        // Calculate totals
        const items = validItems.map((item: any) => {
            const subtotal = item.price * item.quantity;
            return {
                _id: item._id,
                product: item.product_id,
                quantity: item.quantity,
                price: item.price,
                variant: item.variant,
                subtotal
            };
        });

        const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
        const total_amount = items.reduce((sum, item) => sum + item.subtotal, 0);

        sendSuccess(res, {
            message: "Lấy giỏ hàng thành công",
            data: {
                items,
                total_items,
                total_amount
            }
        });
    } catch (error) {
        console.error("Error in getCart:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        const { product_id, quantity = 1, variant } = req.body;

        if (!product_id) {
            sendError(res, 400, "product_id là bắt buộc");
            return;
        }

        const numericQuantity = Number(quantity);
        if (Number.isNaN(numericQuantity) || numericQuantity < 1) {
            sendError(res, 400, "quantity phải là số >= 1");
            return;
        }

        // Validate product exists and is active
        const product = await Product.findOne({
            _id: product_id,
            deleted: false
        });

        // Debug log
        console.log("Product ID:", product_id);
        console.log("Product found:", product);

        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại hoặc đã bị xóa");
            return;
        }

        // Check if product is inactive
        if (product.status !== "active") {
            sendError(res, 400, "Sản phẩm hiện không khả dụng");
            return;
        }

        // Check stock
        if (product.quantity < numericQuantity) {
            sendError(res, 400, `Sản phẩm chỉ còn ${product.quantity} trong kho`);
            return;
        }

        // Find or create cart
        let cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            cart = await Cart.create({
                user_id: userId,
                items: []
            });
        }

        // Check if product already exists in cart (with same variant)
        const existingItemIndex = cart.items.findIndex((item: any) => {
            if (item.product_id.toString() !== product_id) return false;

            // Check if variants match
            if (!variant && !item.variant) return true;
            if (!variant || !item.variant) return false;

            return item.variant.color === variant.color &&
                   item.variant.size === variant.size;
        });

        if (existingItemIndex !== -1) {
            // Update quantity of existing item
            const existingItem = cart.items[existingItemIndex];
            const newQuantity = existingItem.quantity + numericQuantity;

            if (product.quantity < newQuantity) {
                sendError(res, 400, `Sản phẩm chỉ còn ${product.quantity} trong kho`);
                return;
            }

            existingItem.quantity = newQuantity;
        } else {
            // Add new item
            cart.items.push({
                product_id,
                quantity: numericQuantity,
                price: product.price, // Save price at time of adding
                variant: variant || {}
            });
        }

        await cart.save();

        sendSuccess(res, {
            message: "Thêm sản phẩm vào giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        console.error("Error in addToCart:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        const { item_id, quantity } = req.body;

        if (!item_id) {
            sendError(res, 400, "item_id là bắt buộc");
            return;
        }

        if (!quantity || quantity < 1) {
            sendError(res, 400, "quantity phải là số >= 1");
            return;
        }

        const numericQuantity = Number(quantity);
        if (Number.isNaN(numericQuantity) || numericQuantity < 1) {
            sendError(res, 400, "quantity phải là số >= 1");
            return;
        }

        const cart = await Cart.findOne({ user_id: userId });

        if (!cart || cart.items.length === 0) {
            sendError(res, 404, "Giỏ hàng trống");
            return;
        }

        const item = cart.items.id(item_id);

        if (!item) {
            sendError(res, 404, "Sản phẩm không có trong giỏ hàng");
            return;
        }

        // Check stock
        const product = await Product.findOne({
            _id: item.product_id,
            deleted: false,
            status: "active"
        });

        if (product && product.quantity < numericQuantity) {
            sendError(res, 400, `Sản phẩm chỉ còn ${product.quantity} trong kho`);
            return;
        }

        item.quantity = numericQuantity;
        await cart.save();

        sendSuccess(res, {
            message: "Cập nhật giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        console.error("Error in updateCartItem:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        const { id } = req.params;

        if (!id) {
            sendError(res, 400, "id là bắt buộc");
            return;
        }

        const cart = await Cart.findOne({ user_id: userId });

        if (!cart || cart.items.length === 0) {
            sendError(res, 404, "Giỏ hàng trống");
            return;
        }

        const item = cart.items.id(id);

        if (!item) {
            sendError(res, 404, "Sản phẩm không có trong giỏ hàng");
            return;
        }

        item.deleteOne();
        await cart.save();

        sendSuccess(res, {
            message: "Xóa sản phẩm khỏi giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        console.error("Error in removeFromCart:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Xóa toàn bộ giỏ hàng
export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        const cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            sendSuccess(res, {
                message: "Giỏ hàng đã trống"
            });
            return;
        }

        (cart as any).items = [];
        await cart.save();

        sendSuccess(res, {
            message: "Xóa giỏ hàng thành công"
        });
    } catch (error) {
        console.error("Error in clearCart:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Tổng tiền giỏ hàng
export const getCartSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        const cart = await Cart.findOne({ user_id: userId })
            .populate("items.product_id", "status deleted");

        if (!cart || cart.items.length === 0) {
            sendSuccess(res, {
                message: "Giỏ hàng trống",
                data: {
                    total_items: 0,
                    total_amount: 0,
                    estimated_shipping: 0,
                    tax: 0,
                    grand_total: 0
                }
            });
            return;
        }

        // Filter valid items and calculate totals
        const validItems = cart.items.filter((item: any) => {
            return item.product_id &&
                   item.product_id.status === "active" &&
                   !item.product_id.deleted;
        });

        const total_items = validItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const total_amount = validItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        // Estimate shipping (you can adjust this logic)
        const estimated_shipping = total_amount > 5000000 ? 0 : 30000;
        const tax = 0; // No tax for now
        const grand_total = total_amount + estimated_shipping + tax;

        sendSuccess(res, {
            message: "Lấy tổng tiền giỏ hàng thành công",
            data: {
                total_items,
                total_amount,
                estimated_shipping,
                tax,
                grand_total
            }
        });
    } catch (error) {
        console.error("Error in getCartSummary:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};
