// services/filter.service.ts
import type { ProductLean } from "../product.service";

type ValidateResult =
  | { valid: true }
  | { valid: false; message: string };

function safeString(x: unknown): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

function getBrandName(product: ProductLean): string {
  const b: any = product.brand_id;
  if (!b) return "";
  // populated object
  if (typeof b === "object" && b.name) return String(b.name);
  return ""; // nếu chỉ là ObjectId thì không có name
}

function getCategoryName(product: ProductLean): string {
  const c: any = product.category_id;
  if (!c) return "";
  if (typeof c === "object" && c.name) return String(c.name);
  return "";
}

function getSearchText(product: ProductLean): string {
  const parts = [
    product.name,
    product.slug,
    getBrandName(product),
    getCategoryName(product),
    product.description,
    safeString(product.specification),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

const filterService = {
  /**
   * Validate user input
   */
  validateInput(userMessage: unknown): ValidateResult {
    if (!userMessage || typeof userMessage !== "string") {
      return { valid: false, message: "Bạn muốn hỏi gì về laptop ạ? 😊" };
    }

    const trimmed = userMessage.trim();

    if (trimmed.length === 0) {
      return { valid: false, message: "Bạn muốn hỏi gì về laptop ạ? 😊" };
    }

    if (trimmed.length > 500) {
      return {
        valid: false,
        message: "Câu hỏi hơi dài quá bạn ơi 😅 Bạn có thể nói ngắn gọn hơn được không?",
      };
    }

    const spamPatterns =
      /(.)\1{10,}|^[^a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+$/;

    if (spamPatterns.test(trimmed)) {
      return { valid: false, message: "Mình không hiểu lắm, bạn có thể hỏi rõ hơn được không? 🤔" };
    }

    return { valid: true };
  },

  /**
   * Lọc products phù hợp với câu hỏi (Mongo schema)
   * - Ưu tiên quantity > 0
   * - Dùng description/specification để detect gaming/đồ họa/dev...
   */
  filterRelevantProducts(products: ProductLean[], userMessage: string): ProductLean[] {
    const msg = userMessage.toLowerCase();
    let filtered = [...products];

    // Chỉ lấy hàng active/not deleted (phòng khi upstream thay đổi)
    filtered = filtered.filter((p) => p.deleted !== true && p.status !== "inactive");

    // ===== 1) Lọc theo NHU CẦU (dựa vào text tổng hợp) =====
    const wantGaming = /game|gaming|chơi game|fps|valorant|cs2|lol|pubg/i.test(msg);
    const wantOffice = /văn phòng|học tập|học hành|word|excel|ppt|pin trâu|mỏng nhẹ/i.test(msg);
    const wantDesign = /đồ họa|thiết kế|render|dựng video|premiere|after effect|photoshop|3d|blender/i.test(msg);
    const wantDev = /lập trình|code|developer|dev|web|backend|frontend/i.test(msg);

    if (wantGaming) {
      filtered = filtered.filter((p) => {
        const t = getSearchText(p);
        return /(rtx|gtx|gaming|rog|tuf|legion|predator|nitro|msi|victus)/i.test(t);
      });
    }

    if (wantDesign) {
      filtered = filtered.filter((p) => {
        const t = getSearchText(p);
        return /(rtx|quadro|studio|i7|i9|ryzen 7|ryzen 9|16gb|32gb|oled|100% sRGB)/i.test(t);
      });
    }

    if (wantDev) {
      filtered = filtered.filter((p) => {
        const t = getSearchText(p);
        return /(i5|i7|ryzen|16gb|512gb|ssd|macbook|m1|m2|m3)/i.test(t);
      });
    }

    if (wantOffice) {
      // Nếu user nói văn phòng/học tập mà không nói gaming/đồ họa,
      // ưu tiên máy giá vừa phải (có thể chỉnh theo shop)
      if (!wantGaming && !wantDesign) {
        filtered = filtered.filter((p) => p.price <= 20000000);
      }
    }

    // ===== 2) Lọc theo HÃNG (nếu populate brand) hoặc theo name/slug =====
    const brands = ["dell", "hp", "lenovo", "asus", "acer", "msi", "apple", "macbook"];
    for (const brand of brands) {
      if (msg.includes(brand)) {
        const brandFiltered = filtered.filter((p) => {
          const t = getSearchText(p);
          return t.includes(brand);
        });
        if (brandFiltered.length > 0) {
          filtered = brandFiltered;
          break;
        }
      }
    }

    // ===== 3) Lọc theo NGÂN SÁCH =====
    const pricePatterns: RegExp[] = [
      /(\d+)\s*(triệu|tr|trieu)/i,
      /(\d+)\s*tr\b/i,
      /dưới\s*(\d+)/i,
      /khoảng\s*(\d+)/i,
      /tầm\s*(\d+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = msg.match(pattern);
      if (match) {
        const budget = Number(match[1]) * 1_000_000;
        if (!Number.isNaN(budget) && budget > 0) {
          filtered = filtered.filter((p) => p.price >= budget * 0.7 && p.price <= budget * 1.3);
        }
        break;
      }
    }

    // ===== 4) Ưu tiên còn hàng (quantity > 0) =====
    const inStock = filtered.filter((p) => (p.quantity ?? 0) > 0);
    if (inStock.length > 0) filtered = inStock;

    // ===== 5) Giới hạn số lượng (để tránh context quá dài) =====
    const MAX_PRODUCTS = 15;
    if (filtered.length > MAX_PRODUCTS) {
      // Sắp theo giá để lấy dải đa dạng
      filtered.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      const step = Math.max(1, Math.floor(filtered.length / MAX_PRODUCTS));
      filtered = filtered.filter((_, idx) => idx % step === 0).slice(0, MAX_PRODUCTS);
    }

    // Nếu lọc quá ít -> fallback lấy top sản phẩm (ưu tiên còn hàng + best seller)
    if (filtered.length === 0) {
      const fallback = [...products]
        .filter((p) => p.deleted !== true && p.status !== "inactive" && (p.quantity ?? 0) > 0)
        .sort((a, b) => (b.buyturn ?? 0) - (a.buyturn ?? 0))
        .slice(0, MAX_PRODUCTS);

      console.log("⚠️ No filtered products, using fallback");
      return fallback;
    }

    console.log(`✅ Filtered: ${filtered.length}/${products.length} products`);
    return filtered;
  },
};

export default filterService;
