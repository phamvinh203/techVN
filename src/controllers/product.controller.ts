import { Request, Response } from "express";
import { sendError, sendSuccess } from "~/helpers/responese";
import { uploadProductImage, removeProductImage, removeProductFolder } from "~/helpers/upload";
import Product from "~/models/product.model";
import { generateUniqueSlug } from "~/utils/slug.util";

// Tạo sản phẩm mới 
export const createProduct = async (req: Request, res: Response): Promise<void> => {
	try {
		const {
			name,
			price,
			oldprice,
			image,
			description,
			specification,
			quantity,
			brand_id,
			category_id
		} = req.body;

		if (!name || price === undefined) {
			sendError(res, 400, "name và price là bắt buộc");
			return;
		}

		const numericPrice = Number(price);
		if (Number.isNaN(numericPrice) || numericPrice < 0) {
			sendError(res, 400, "price phải là số >= 0");
			return;
		}

		const numericOldprice = oldprice !== undefined && oldprice !== "" ? Number(oldprice) : undefined;
		if (numericOldprice !== undefined) {
			if (Number.isNaN(numericOldprice) || numericOldprice < 0) {
				sendError(res, 400, "oldprice phải là số >= 0");
				return;
			}
		}

		const numericQuantity = quantity !== undefined && quantity !== "" ? Number(quantity) : 0;
		if (Number.isNaN(numericQuantity) || numericQuantity < 0) {
			sendError(res, 400, "quantity phải là số >= 0");
			return;
		}

		const productSlug = generateUniqueSlug(name);
		const files = (req as Request & { files?: Express.Multer.File[] }).files;

		let imageUrls: string[] = [];
		if (files && files.length > 0) {
			try {
				const uploadPromises = files.map(file => uploadProductImage(file, productSlug));
				const uploadResults = await Promise.all(uploadPromises);
				imageUrls = uploadResults.map(res => res.publicUrl);
			} catch (uploadErr: any) {
				sendError(res, 500, uploadErr?.message || "Lỗi khi tải ảnh lên Supabase");
				return;
			}
		} else if (image) {
            imageUrls = Array.isArray(image) ? image : [image];
        }

		const productData: any = {
			name,
			price: numericPrice,
			oldprice: numericOldprice,
			images: imageUrls,
			description,
			specification,
			buyturn: 0,
			quantity: numericQuantity,
			slug: productSlug
		};

		if (brand_id && brand_id !== "" && brand_id !== "null" && brand_id !== "undefined") {
			productData.brand_id = brand_id;
		}
		
		if (category_id && category_id !== "" && category_id !== "null" && category_id !== "undefined") {
			productData.category_id = category_id;
		}

		const product = await Product.create(productData);

		res.status(201).json({
            success: true,
            message: "Tạo sản phẩm thành công",
            data: product
        });
	} catch (error) {
		console.error("Error in createProduct:", error);
		sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
	}
};

// Cập nhật sản phẩm 
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            name,
            price,
            oldprice,
            description,
            specification,
            quantity,
            brand_id,
            category_id
        } = req.body;


        const product = await Product.findOne({ _id: id, deleted: false });
        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        // Validate price nếu có
        if (price !== undefined) {
            const numericPrice = Number(price);
            if (Number.isNaN(numericPrice) || numericPrice < 0) {
                sendError(res, 400, "price phải là số >= 0");
                return;
            }
            product.price = numericPrice;
        }

        // Validate oldprice nếu có
        if (oldprice !== undefined) {
            const numericOldprice = Number(oldprice);
            if (Number.isNaN(numericOldprice) || numericOldprice < 0) {
                sendError(res, 400, "oldprice phải là số >= 0");
                return;
            }
            if (numericOldprice < (product.price || 0)) {
                sendError(res, 400, "oldprice không được nhỏ hơn price");
                return;
            }
            product.oldprice = numericOldprice;
        }

        // Validate quantity nếu có
        if (quantity !== undefined) {
            const numericQuantity = Number(quantity);
            if (Number.isNaN(numericQuantity) || numericQuantity < 0) {
                sendError(res, 400, "quantity phải là số >= 0");
                return;
            }
            product.quantity = numericQuantity;
        }

        const files = (req as Request & { files?: Express.Multer.File[] }).files;

        // Upload ảnh mới nếu có
        if (files && files.length > 0) {
            try {
                const productSlug = product.slug || generateUniqueSlug(product.name);
                const uploadPromises = files.map(file => uploadProductImage(file, productSlug));
                const uploadResults = await Promise.all(uploadPromises);
                const newImageUrls = uploadResults.map(res => res.publicUrl);
                
                // Thêm các ảnh mới vào mảng images hiện tại
                product.images = [...(product.images || []), ...newImageUrls];
            } catch (uploadErr: any) {
                sendError(res, 500, uploadErr?.message || "Lỗi khi tải ảnh lên Supabase");
                return;
            }
        }

        // Cập nhật các field khác
        if (name) {
            product.name = name;
            product.slug = generateUniqueSlug(name);
        }
        if (description !== undefined) product.description = description;
        if (specification !== undefined) product.specification = specification;
        if (brand_id && brand_id !== "" && brand_id !== "null" && brand_id !== "undefined") {
            product.brand_id = brand_id;
        } else if (brand_id === "" || brand_id === "null") {
            product.brand_id = undefined;
        }

        if (category_id && category_id !== "" && category_id !== "null" && category_id !== "undefined") {
            product.category_id = category_id;
        } else if (category_id === "" || category_id === "null") {
            product.category_id = undefined;
        }

        await product.save();

        sendSuccess(res, {
            message: "Cập nhật sản phẩm thành công",
            data: product
        });
    } catch (error) {
        console.error("Error in updateProduct:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Cập nhật số lượng sản phẩm trong kho 
export const updateProductStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined) {
            sendError(res, 400, "quantity là bắt buộc");
            return;
        }

        const numericQuantity = Number(quantity);
        if (Number.isNaN(numericQuantity) || numericQuantity < 0) {
            sendError(res, 400, "quantity phải là số >= 0");
            return;
        }

        const product = await Product.findOneAndUpdate(
            { _id: id, deleted: false },
            { quantity: numericQuantity },
            { new: true }
        );

        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        sendSuccess(res, {
            message: "Cập nhật số lượng thành công",
            data: product
        });
    } catch (error) {
        console.error("Error in updateProductStock:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Ẩn/Hiện sản phẩm 
export const statusToggleProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, deleted: false });
        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        // Toggle status: active <-> inactive
        product.status = product.status === "active" ? "inactive" : "active";
        await product.save();

        sendSuccess(res, {
            message: `Sản phẩm đã được ${product.status === "active" ? "hiện" : "ẩn"}`,
            data: product
        });
    } catch (error) {
        console.error("Error in statusToggleProduct:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Xóa sản phẩm (soft delete)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, deleted: false });
        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        // Soft delete
        product.deleted = true;
        product.status = "inactive";
        await product.save();

        sendSuccess(res, {
            message: "Xóa sản phẩm thành công"
        });
    } catch (error) {
        console.error("Error in deleteProduct:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Lấy tất cả sản phẩm với phân trang và lọc
export const getALLProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10,
            keyword,
            category_id,
            brand_id,
            minPrice,
            maxPrice,
            sort = "newest"
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build query
        const query: any = {
            deleted: false,
            status: "active"
        };

        // Search by keyword (name)
        if (keyword && typeof keyword === "string") {
            query.name = { $regex: keyword, $options: "i" };
        }

        // Filter by category
        if (category_id && typeof category_id === "string") {
            query.category_id = category_id;
        }

        // Filter by brand
        if (brand_id && typeof brand_id === "string") {
            query.brand_id = brand_id;
        }

        // Filter by price range
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) {
                query.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined) {
                query.price.$lte = Number(maxPrice);
            }
        }

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

        // Execute query
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
            message: "Lấy danh sách sản phẩm thành công",
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
        console.error("Error in getALLProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Chi tiết sản phẩm theo ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            sendError(res, 400, "ID sản phẩm không hợp lệ");
            return;
        }

        const product = await Product.findOne({
            _id: id,
            deleted: false,
            status: "active"
        })
        .populate("brand_id", "name")
        .populate("category_id", "name");

        if (!product) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        sendSuccess(res, {
            message: "Lấy chi tiết sản phẩm thành công",
            data: product
        });
    } catch (error) {
        console.error("Error in getProductById:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Sản phẩm nổi bật
export const getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit = 8 } = req.query;
        const limitNum = Number(limit);

        const products = await Product.find({
            deleted: false,
            status: "active"
        })
        .sort({ buyturn: -1 })
        .limit(limitNum)
        .populate("brand_id", "name")
        .populate("category_id", "name");

        sendSuccess(res, {
            message: "Lấy sản phẩm nổi bật thành công",
            data: products
        });
    } catch (error) {
        console.error("Error in getFeaturedProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Sản phẩm mới nhất
export const getNewProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit = 8 } = req.query;
        const limitNum = Number(limit);

        const products = await Product.find({
            deleted: false,
            status: "active"
        })
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .populate("brand_id", "name")
        .populate("category_id", "name");

        sendSuccess(res, {
            message: "Lấy sản phẩm mới nhất thành công",
            data: products
        });
    } catch (error) {
        console.error("Error in getNewProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Sản phẩm bán chạy nhất
export const getTopSellingProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit = 8 } = req.query;
        const limitNum = Number(limit);

        const products = await Product.find({
            deleted: false,
            status: "active"
        })
        .sort({ buyturn: -1 })
        .limit(limitNum)
        .populate("brand_id", "name")
        .populate("category_id", "name");

        sendSuccess(res, {
            message: "Lấy sản phẩm bán chạy thành công",
            data: products
        });
    } catch (error) {
        console.error("Error in getTopSellingProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// Sản phẩm liên quan
export const getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { limit = 4 } = req.query;
        const limitNum = Number(limit);

        // Get current product
        const currentProduct = await Product.findOne({
            _id: id,
            deleted: false,
            status: "active"
        });

        if (!currentProduct) {
            sendError(res, 404, "Sản phẩm không tồn tại");
            return;
        }

        // Build query for related products
        const query: any = {
            _id: { $ne: id },
            deleted: false,
            status: "active"
        };

        // Find products with same category OR brand
        if (currentProduct.category_id || currentProduct.brand_id) {
            query.$or = [];

            if (currentProduct.category_id) {
                query.$or.push({ category_id: currentProduct.category_id });
            }

            if (currentProduct.brand_id) {
                query.$or.push({ brand_id: currentProduct.brand_id });
            }
        }

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .populate("brand_id", "name")
            .populate("category_id", "name");

        sendSuccess(res, {
            message: "Lấy sản phẩm liên quan thành công",
            data: products
        });
    } catch (error) {
        console.error("Error in getRelatedProducts:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

// API cho hình ảnh Lazy loading
export const getProductImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query: any = {
            deleted: false,
            status: "active",
            images: { $exists: true, $ne: [] }
        };

        const [products, totalItems] = await Promise.all([
            Product.find(query)
                .select("_id images")
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Product.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalItems / limitNum);

        // Transform products into images array
        const images = products.reduce((acc: any[], product) => {
            if (product.images && product.images.length > 0) {
                product.images.forEach((image: string) => {
                    acc.push({
                        _id: product._id,
                        image
                    });
                });
            }
            return acc;
        }, []);

        sendSuccess(res, {
            message: "Lấy danh sách hình ảnh thành công",
            data: {
                images,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        console.error("Error in getProductImages:", error);
        sendError(res, 500, error instanceof Error ? `Lỗi server: ${error.message}` : "Lỗi server không xác định");
    }
};

