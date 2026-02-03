import Product from "~/models/product.model";


type PopulatedRef = { _id: unknown; name?: string; slug?: string } | null | undefined;

export type ProductLean = {
  _id: unknown;
  name: string;
  slug?: string;
  price: number;
  oldprice?: number;
  images?: string[];
  description?: string;
  specification?: Record<string, unknown> | string | null;
  buyturn?: number;
  quantity?: number;
  brand_id?: PopulatedRef;
  category_id?: PopulatedRef;
  status?: "active" | "inactive";
  deleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const productService = {
  /**
   * Lấy danh sách sản phẩm ACTIVE + NOT deleted cho chatbot
   * - lean(): tối ưu performance
   * - select(): chỉ lấy field cần cho prompt/filter
   * - populate(): để chatbot thấy brand/category name (giúp tư vấn tốt hơn)
   */
  async getAllProducts(): Promise<ProductLean[]> {
    const products = await Product.find({
      deleted: false,
      status: "active",
    })
      .select(
        "name slug price oldprice images description specification buyturn quantity brand_id category_id status deleted createdAt"
      )
      .populate("brand_id", "name slug")
      .populate("category_id", "name slug")
      .lean<ProductLean[]>();

    return products;
  },

  async getProductById(id: string): Promise<ProductLean | null> {
    const product = await Product.findOne({
      _id: id,
      deleted: false,
      status: "active",
    })
      .select(
        "name slug price oldprice images description specification buyturn quantity brand_id category_id status deleted createdAt"
      )
      .populate("brand_id", "name slug")
      .populate("category_id", "name slug")
      .lean<ProductLean>();

    return product ?? null;
  },
};

export default productService;
