import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import Brand from "~/models/brand.model";
import Category from "~/models/category.model";
import Product from "~/models/product.model";
import User from "~/models/user.model";

// Search theo keyword
export const searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            keyword,
            page = 1,
            limit = 10
        } = req.query;

        if (!keyword || typeof keyword !== "string") {
            sendError(res, 400, "keyword là bắt buộc");
            return;
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query: any = {
            deleted: false,
            status: "active",
            name: { $regex: keyword, $options: "i" }
        };

        const [products, totalItems] = await Promise.all([
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate("brand_id", "name")
                .populate("category_id", "name"),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalItems / limitNum);

        sendSuccess(res, {
            message: "Tìm kiếm sản phẩm thành công",
            data: {
                products,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        console.error("Error in searchProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Lọc sản phẩm theo giá, hãng, danh mục
export const filterProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      minPrice,
      maxPrice,
      brand,        
      category,     
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {
      deleted: false,
      status: "active"
    };

    // Filter price
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by brand SLUG
    if (brand && typeof brand === "string") {
      const brandDoc = await Brand.findOne({ slug: brand }).select("_id");
      if (!brandDoc) {
        sendSuccess(res, {
          message: "Lọc sản phẩm thành công",
          data: {
            products: [],
            pagination: {
              totalItems: 0,
              totalPages: 0,
              currentPage: pageNum,
              limit: limitNum
            }
          }
        });
        return;
      }
      query.brand_id = brandDoc._id;
    }

    // Filter by category SLUG
    if (category && typeof category === "string") {
      const categoryDoc = await Category.findOne({ slug: category }).select("_id");
      if (!categoryDoc) {
        sendSuccess(res, {
          message: "Lọc sản phẩm thành công",
          data: {
            products: [],
            pagination: {
              totalItems: 0,
              totalPages: 0,
              currentPage: pageNum,
              limit: limitNum
            }
          }
        });
        return;
      }
      query.category_id = categoryDoc._id;
    }

    const [products, totalItems] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("brand_id", "name slug")
        .populate("category_id", "name slug"),
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    sendSuccess(res, {
      message: "Lọc sản phẩm thành công",
      data: {
        products,
        pagination: {
          totalItems,
          totalPages,
          currentPage: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error("Error in filterProducts:", error);
    sendError(res, 500, "Lỗi server");
  }
};

// Sắp xếp sản phẩm
export const sortProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            sort = "newest",
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query: any = {
            deleted: false,
            status: "active"
        };

        // Build sort option
        let sortOption: any = {};
        switch (sort) {
            case "price_asc":
                sortOption = { price: 1 };
                break;
            case "price_desc":
                sortOption = { price: -1 };
                break;
            case "newest":
                sortOption = { createdAt: -1 };
                break;
            case "best_seller":
                sortOption = { buyturn: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const [products, totalItems] = await Promise.all([
            Product.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum)
                .populate("brand_id", "name")
                .populate("category_id", "name"),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalItems / limitNum);

        sendSuccess(res, {
            message: "Sắp xếp sản phẩm thành công",
            data: {
                products,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        console.error("Error in sortProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Gợi ý tìm kiếm (dựa trên sản phẩm phổ biến)
export const getSearchSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { keyword, limit = 5 } = req.query;

        const limitNum = Number(limit);

        const query: any = {
            deleted: false,
            status: "active"
        };

        // Filter by keyword if provided
        if (keyword && typeof keyword === "string") {
            query.name = { $regex: keyword, $options: "i" };
        }

        // Get popular products (sorted by buyturn)
        const products = await Product.find(query)
            .sort({ buyturn: -1 })
            .limit(limitNum)
            .select("id name slug images price buyturn")
            .lean();

        // Extract product names as suggestions
        const suggestions = products.map(p => ({
            _id: p._id,
            name: p.name,
            slug: p.slug,
            thumbnail: p.images?.[0] || null,
            price: p.price,
            popularity: p.buyturn || 0
        }));

        sendSuccess(res, {
            message: "Lấy gợi ý tìm kiếm thành công",
            data: suggestions
        });
    } catch (error) {
        console.error("Error in getSearchSuggestions:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Lưu lịch sử tìm kiếm của user
export const saveSearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { keyword } = req.body;
        const userId = (req as any).user?.user_id;

        if (!userId) {
            sendError(res, 401, "Bạn cần đăng nhập để thực hiện chức năng này");
            return;
        }

        if (!keyword || typeof keyword !== "string") {
            sendError(res, 400, "keyword là bắt buộc");
            return;
        }

        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) {
            sendError(res, 400, "keyword không được để trống");
            return;
        }

        const user = await User.findById(userId);

        if (!user) {
            sendError(res, 404, "Người dùng không tồn tại");
            return;
        }

        // Initialize searchHistory if not exists
        if (!user.searchHistory) {
            (user as any).searchHistory = [];
        }

        // Check if keyword already exists in history
        const existingIndex = user.searchHistory.findIndex(
            (item: any) => item.keyword.toLowerCase() === trimmedKeyword.toLowerCase()
        );

        if (existingIndex !== -1) {
            // Remove existing entry to move it to the top
            (user as any).searchHistory.splice(existingIndex, 1);
        }

        // Add new keyword to the beginning
        (user as any).searchHistory.unshift({
            keyword: trimmedKeyword,
            timestamp: new Date()
        });

        // Keep only the latest 20 entries
        if (user.searchHistory.length > 20) {
            (user as any).searchHistory = user.searchHistory.slice(0, 20);
        }

        await user.save();

        sendSuccess(res, {
            message: "Lưu lịch sử tìm kiếm thành công",
            data: user.searchHistory
        });
    } catch (error) {
        console.error("Error in saveSearchHistory:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};
