import productService, { ProductLean } from "../product.service";
import { ProductForChat } from "./types";

type ProductCache = {
  getProducts(): Promise<ProductForChat[]>;
  clearCache(): void;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

function normalizeProduct(p: ProductLean): ProductForChat {
  const brandName =
    typeof p.brand_id === "object" && p.brand_id !== null && "name" in p.brand_id
      ? String((p as any).brand_id.name)
      : undefined;

  const categoryName =
    typeof p.category_id === "object" && p.category_id !== null && "name" in p.category_id
      ? String((p as any).category_id.name)
      : undefined;

  return {
    _id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    oldprice: p.oldprice,
    images: p.images,
    description: p.description,
    specification: p.specification ?? null,
    buyturn: p.buyturn,
    quantity: p.quantity,
    brandName,
    categoryName,
    status: p.status,
    deleted: p.deleted,
  };
}

class InMemoryProductCache implements ProductCache {
  private cachedProducts: ProductForChat[] | null = null;
  private cacheTime: number | null = null;

  async getProducts(): Promise<ProductForChat[]> {
    const now = Date.now();

    if (this.cachedProducts && this.cacheTime && now - this.cacheTime < CACHE_DURATION) {
      console.log("📦 Using cached products");
      return this.cachedProducts;
    }

    console.log("🔎 Fetching fresh products");
    const fresh = await productService.getAllProducts();
    this.cachedProducts = fresh.map(normalizeProduct);
    this.cacheTime = now;
    return this.cachedProducts;
  }

  clearCache(): void {
    this.cachedProducts = null;
    this.cacheTime = null;
    console.log("🗑️ Cache cleared");
  }
}

const cacheService: ProductCache = new InMemoryProductCache();

export default cacheService;
