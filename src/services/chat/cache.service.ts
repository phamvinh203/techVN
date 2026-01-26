// services/cache.service.ts

import productService, { ProductLean } from "../product.service";


// Cache cho products
let cachedProducts: ProductLean[] | null = null;
let cacheTime: number | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

const cacheService = {
  /**
   * Get products with caching
   */
  async getProducts(): Promise<ProductLean[]> {
    const now = Date.now();

    if (cachedProducts && cacheTime && now - cacheTime < CACHE_DURATION) {
      console.log("📦 Using cached products");
      return cachedProducts;
    }

    console.log("🔄 Fetching fresh products");
    cachedProducts = await productService.getAllProducts();
    cacheTime = now;

    return cachedProducts;
  },

  /**
   * Clear cache (gọi khi update products)
   */
  clearCache(): void {
    cachedProducts = null;
    cacheTime = null;
    console.log("🗑️ Cache cleared");
  },
};

export default cacheService;
