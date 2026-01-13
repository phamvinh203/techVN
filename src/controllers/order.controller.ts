import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Order from "~/models/order.model";
import Product from "~/models/product.model";
import Cart from "~/models/cart.model";

// Helper function to generate unique order code
const generateOrderCode = async (): Promise<string> => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');

  let orderCode: string;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    orderCode = `ORD${dateStr}${random}`;

    const existingOrder = await Order.findOne({ order_code: orderCode });
    if (!existingOrder) {
      isUnique = true;
    }
    attempts++;
  }

  return orderCode!;
};

// Helper function to validate and prepare order items
const validateOrderItems = async (items: any[]) => {
  const validItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.product_id,
      deleted: false,
      status: "active"
    });

    if (!product) {
      throw new Error(`Sản phẩm ${item.product_id} không tồn tại hoặc không khả dụng`);
    }

    const quantity = Number(item.quantity) || 1;
    if (quantity < 1) {
      throw new Error("Số lượng phải >= 1");
    }

    if (product.quantity < quantity) {
      throw new Error(`Sản phẩm ${product.name} chỉ còn ${product.quantity} trong kho`);
    }

    const subtotal = product.price * quantity;
    totalAmount += subtotal;

    validItems.push({
      product_id: product._id,
      name: product.name,
      quantity,
      price: product.price,
      variant: item.variant || {},
      subtotal
    });
  }

  return { validItems, totalAmount };
};

// Helper function to deduct stock
const deductStock = async (items: any[]) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product_id, {
      $inc: { quantity: -item.quantity, buyturn: item.quantity }
    });
  }
};

// Helper function to restore stock
const restoreStock = async (items: any[]) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product_id, {
      $inc: { quantity: item.quantity, buyturn: -item.quantity }
    });
  }
};

// Checkout - Tạo đơn hàng từ giỏ hàng
export const checkout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.user_id;

    if (!userId) {
      sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
      return;
    }

    const { shipping_address, notes } = req.body;

    // Validate shipping address
    if (!shipping_address || !shipping_address.recipient_name || !shipping_address.recipient_phone || !shipping_address.address) {
      sendError(res, 400, "shipping_address là bắt buộc (recipient_name, recipient_phone, address)");
      return;
    }

    // Get cart
    const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id");

    if (!cart || cart.items.length === 0) {
      sendError(res, 400, "Giỏ hàng trống");
      return;
    }

    // Prepare order items from cart
    const orderItemsData = cart.items.map((item: any) => ({
      product_id: item.product_id._id,
      quantity: item.quantity,
      variant: item.variant
    }));

    // Validate items and calculate total
    const { validItems, totalAmount } = await validateOrderItems(orderItemsData);

    // Calculate shipping fee
    const shippingFee = totalAmount > 5000000 ? 0 : 30000;
    const finalAmount = totalAmount + shippingFee;

    // Generate order code
    const orderCode = await generateOrderCode();

    // Create order
    const order = await Order.create({
      user_id: userId,
      order_code: orderCode,
      items: validItems,
      shipping_address,
      payment_method: {
        type: "COD",
        status: "pending"
      },
      order_status: "pending",
      total_amount: totalAmount,
      shipping_fee: shippingFee,
      final_amount: finalAmount,
      notes
    });

    // Deduct stock
    await deductStock(validItems);

    // Clear cart
    (cart as any).items = [];
    await cart.save();

    sendSuccess(res, {
      message: "Đặt hàng thành công",
      data: order
    });
  } catch (error) {
    console.error("Error in checkout:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Create Order - Tạo đơn hàng thủ công (không từ giỏ)
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.user_id;

    if (!userId) {
      sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
      return;
    }

    const { items, shipping_address, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendError(res, 400, "items là bắt buộc và phải là mảng");
      return;
    }

    if (!shipping_address || !shipping_address.recipient_name || !shipping_address.recipient_phone || !shipping_address.address) {
      sendError(res, 400, "shipping_address là bắt buộc (recipient_name, recipient_phone, address)");
      return;
    }

    // Validate items and calculate total
    const { validItems, totalAmount } = await validateOrderItems(items);

    // Calculate shipping fee
    const shippingFee = totalAmount > 5000000 ? 0 : 30000;
    const finalAmount = totalAmount + shippingFee;

    // Generate order code
    const orderCode = await generateOrderCode();

    // Create order
    const order = await Order.create({
      user_id: userId,
      order_code: orderCode,
      items: validItems,
      shipping_address,
      payment_method: {
        type: "COD",
        status: "pending"
      },
      order_status: "pending",
      total_amount: totalAmount,
      shipping_fee: shippingFee,
      final_amount: finalAmount,
      notes
    });

    // Deduct stock
    await deductStock(validItems);

    sendSuccess(res, {
      message: "Tạo đơn hàng thành công",
      data: order
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Get Order By Id - Chi tiết đơn hàng
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.user_id;
    const userRole = (req as any).user?.role;
    const { id } = req.params;

    if (!userId) {
      sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
      return;
    }

    const order = await Order.findById(id)
      .populate("user_id", "full_name email phone")
      .populate("items.product_id", "name images");

    if (!order) {
      sendError(res, 404, "Đơn hàng không tồn tại");
      return;
    }

    // Check permission: user can only see their own orders, admin can see all
    if (userRole !== "Admin" && order.user_id._id.toString() !== userId) {
      sendError(res, 403, "Bạn không có quyền xem đơn hàng này");
      return;
    }

    sendSuccess(res, {
      message: "Lấy chi tiết đơn hàng thành công",
      data: order
    });
  } catch (error) {
    console.error("Error in getOrderById:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Get My Orders - Lịch sử mua hàng
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.user_id;

    if (!userId) {
      sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
      return;
    }

    const {
      page = 1,
      limit = 10,
      status
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {
      user_id: userId
    };

    if (status && typeof status === "string") {
      query.order_status = status;
    }

    const [orders, totalItems] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("items.product_id", "name images"),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    sendSuccess(res, {
      message: "Lấy danh sách đơn hàng thành công",
      data: {
        orders,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error("Error in getMyOrders:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Cancel Order - Hủy đơn hàng
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.user_id;
    const { id } = req.params;
    const { cancelled_reason } = req.body;

    if (!userId) {
      sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
      return;
    }

    const order = await Order.findById(id);

    if (!order) {
      sendError(res, 404, "Đơn hàng không tồn tại");
      return;
    }

    // Check permission
    if (order.user_id.toString() !== userId) {
      sendError(res, 403, "Bạn không có quyền hủy đơn hàng này");
      return;
    }

    // Check if order can be cancelled
    if (!["pending", "confirmed"].includes(order.order_status)) {
      sendError(res, 400, `Không thể hủy đơn hàng với trạng thái ${order.order_status}`);
      return;
    }

    // Update order status
    order.order_status = "cancelled";
    order.cancelled_at = new Date();
    order.cancelled_reason = cancelled_reason;

    await order.save();

    // Restore stock
    await restoreStock(order.items);

    sendSuccess(res, {
      message: "Hủy đơn hàng thành công",
      data: order
    });
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Get All Orders (Admin) - Danh sách tất cả đơn hàng
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      from_date,
      to_date,
      user_id,
      sort = "newest"
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Filter by status
    if (status && typeof status === "string") {
      query.order_status = status;
    }

    // Filter by date range
    if (from_date || to_date) {
      query.createdAt = {};
      if (from_date) {
        query.createdAt.$gte = new Date(from_date as string);
      }
      if (to_date) {
        query.createdAt.$lte = new Date(to_date as string);
      }
    }

    // Filter by user
    if (user_id && typeof user_id === "string") {
      query.user_id = user_id;
    }

    // Build sort option
    let sortOption: any = {};
    switch (sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "total_amount_asc":
        sortOption = { final_amount: 1 };
        break;
      case "total_amount_desc":
        sortOption = { final_amount: -1 };
        break;
      case "newest":
      default:
        sortOption = { createdAt: -1 };
    }

    const [orders, totalItems] = await Promise.all([
      Order.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate("user_id", "full_name email phone")
        .populate("items.product_id", "name images"),
      Order.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    sendSuccess(res, {
      message: "Lấy danh sách đơn hàng thành công",
      data: {
        orders,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};

// Update Order Status (Admin) - Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      sendError(res, 400, "status là bắt buộc");
      return;
    }

    const validStatuses = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      sendError(res, 400, "Trạng thái không hợp lệ");
      return;
    }

    const order = await Order.findById(id);

    if (!order) {
      sendError(res, 404, "Đơn hàng không tồn tại");
      return;
    }

    // Validate status transitions
    const currentStatus = order.order_status;
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipping", "cancelled"],
      shipping: ["delivered", "cancelled"],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      sendError(res, 400, `Không thể chuyển từ trạng thái ${currentStatus} sang ${status}`);
      return;
    }

    // Update status
    order.order_status = status;

    // Update additional fields based on status
    if (status === "delivered") {
      order.delivered_at = new Date();
      order.payment_method.status = "paid";
    } else if (status === "cancelled") {
      order.cancelled_at = new Date();
      // Restore stock if not already done
      await restoreStock(order.items);
    }

    await order.save();

    sendSuccess(res, {
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: order
    });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
  }
};
