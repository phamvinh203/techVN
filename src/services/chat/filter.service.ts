import type { ProductForChat } from "./types";

type ValidateResult =
  | { valid: true }
  | { valid: false; message: string };

type IntentFlags = {
  gaming: boolean;
  office: boolean;
  design: boolean;
  dev: boolean;
};

// Loại bỏ dấu, ký tự thừa để so khớp gần đúng tên sản phẩm
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeString(x: unknown): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

function buildSearchText(product: ProductForChat): string {
  const parts = [
    product.name,
    product.slug,
    product.brandName,
    product.categoryName,
    product.description,
    safeString(product.specification),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function detectIntent(message: string): IntentFlags {
  const msg = message.toLowerCase();
  return {
    gaming: /game|gaming|fps|valorant|cs2|lol|pubg|rtx|gtx/.test(msg),
    office: /văn phòng|học tập|word|excel|ppt|pin trâu|mỏng nhẹ/.test(msg),
    design: /đồ họa|thiết kế|render|premiere|after effect|photoshop|3d|blender/.test(msg),
    dev: /lập trình|code|developer|dev|web|backend|frontend/.test(msg),
  };
}

function parseBudget(message: string): number | null {
  const msg = message.toLowerCase();
  const patterns: RegExp[] = [
    /(\d+)\s*(triệu|tr|trieu)\b/,
    /dưới\s*(\d+)\b/,
    /khoảng\s*(\d+)\b/,
    /tầm\s*(\d+)\b/,
  ];

  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match) {
      const budget = Number(match[1]) * 1_000_000;
      if (!Number.isNaN(budget) && budget > 0) return budget;
    }
  }

  return null;
}

function scoreProduct(
  product: ProductForChat,
  intent: IntentFlags,
  budget: number | null,
  userMessage: string
): number {
  const text = buildSearchText(product);
  let score = 0;

  // Availability
  if ((product.quantity ?? 0) > 0) score += 2;
  else score -= 2;

  // Popularity
  if (typeof product.buyturn === "number") {
    score += Math.min(product.buyturn / 50, 3); // dampen large values
  }

  // Brand match
  const brands = ["dell", "hp", "lenovo", "asus", "acer", "msi", "apple", "macbook"];
  for (const brand of brands) {
    if (userMessage.toLowerCase().includes(brand) && text.includes(brand)) {
      score += 3;
      break;
    }
  }

  // Budget fit
  if (budget && product.price) {
    const gap = Math.abs(product.price - budget) / budget;
    score += Math.max(0, 4 - gap * 8); // closer price => higher score
  }

  // Intent fit
  if (intent.gaming && /(rtx|gtx|gaming|rog|legion|predator|nitro|tuf)/i.test(text)) {
    score += 4;
  }
  if (intent.design && /(rtx|quadro|studio|i7|i9|ryzen 7|ryzen 9|16gb|32gb|oled|srgb)/i.test(text)) {
    score += 3;
  }
  if (intent.dev && /(i5|i7|ryzen|16gb|512gb|ssd|macbook|m1|m2|m3)/i.test(text)) {
    score += 2.5;
  }
  if (intent.office && product.price && product.price <= 20_000_000) {
    score += 2;
  }

  // Keyword overlap
  const keywords = userMessage
    .toLowerCase()
    .split(/\W+/)
    .filter((k) => k.length > 3);
  const keywordHits = keywords.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);
  score += keywordHits * 0.3;

  return score;
}

const promptInjectionRegex =
  /(ignore (all )?previous|bỏ qua (tất cả|mọi)|forget (all )?rules|system prompt|hủy lệnh|clear instructions|jailbreak)/i;

const filterService = {
  validateInput(userMessage: unknown): ValidateResult {
    if (!userMessage || typeof userMessage !== "string") {
      return { valid: false, message: "Bạn muốn hỏi gì về laptop ạ? 🙂" };
    }

    const trimmed = userMessage.trim();

    if (trimmed.length === 0) {
      return { valid: false, message: "Bạn muốn hỏi gì về laptop ạ? 🙂" };
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
      return {
        valid: false,
        message: "Mình không hiểu lắm, bạn có thể hỏi rõ hơn được không? 🤔",
      };
    }

    return { valid: true };
  },

  isPromptInjection(userMessage: string): boolean {
    return promptInjectionRegex.test(userMessage);
  },

  /**
   * Tìm sản phẩm được nhắc tên (hỏi cấu hình). Ưu tiên match gần đúng name/slug.
   * Đặt ngưỡng để tránh match bừa.
   */
  findMentionedProduct(products: ProductForChat[], userMessage: string): ProductForChat | null {
    const normMsg = normalizeText(userMessage);
    const specKeywords =
      /(cau hinh|cấu hình|thong so|thông số|spec|chi tiet|chi tiết|review nhanh|specs)/i;
    if (!specKeywords.test(userMessage)) return null;

    const tokensMsg = normMsg.split(" ").filter((t) => t.length > 2);
    if (tokensMsg.length === 0) return null;

    let best: { p: ProductForChat; score: number } | null = null;

    for (const p of products) {
      const normName = normalizeText(p.name);
      const normSlug = p.slug ? normalizeText(p.slug) : "";

      // Điểm match
      let score = 0;
      if (normMsg.includes(normName) || normName.includes(normMsg)) score += 70; // gần như exact
      if (normSlug && (normMsg.includes(normSlug) || normSlug.includes(normMsg))) score += 50;

      const tokensName = normName.split(" ").filter((t) => t.length > 2);
      const overlap = tokensName.filter((t) => tokensMsg.includes(t)).length;
      score += overlap * 8;

      const containsName = tokensMsg.join(" ").includes(normName);
      if (containsName) score += 20;

      // Ưu tiên còn hàng
      if ((p.quantity ?? 0) > 0) score += 5;

      if (!best || score > best.score) {
        best = { p, score };
      }
    }

    // Ngưỡng để tránh match sai
    if (best && best.score >= 70) {
      return best.p;
    }
    return null;
  },

  filterRelevantProducts(products: ProductForChat[], userMessage: string): ProductForChat[] {
    const msg = userMessage.toLowerCase();
    const intent = detectIntent(msg);
    const budget = parseBudget(msg);

    let candidates = products.filter((p) => p.deleted !== true && p.status !== "inactive");

    if (candidates.length === 0) return [];

    const scored = candidates
      .map((p) => ({ product: p, score: scoreProduct(p, intent, budget, userMessage) }))
      .sort((a, b) => b.score - a.score);

    const MAX_PRODUCTS = 5;
    const result = scored.slice(0, MAX_PRODUCTS).map((x) => x.product);

    if (result.length === 0) {
      const fallback = [...products]
        .filter((p) => p.deleted !== true && p.status !== "inactive" && (p.quantity ?? 0) > 0)
        .sort((a, b) => (b.buyturn ?? 0) - (a.buyturn ?? 0))
        .slice(0, MAX_PRODUCTS);

      console.log("⚠️ No filtered products, using fallback");
      return fallback;
    }

    console.log(`✅ Filtered: ${result.length}/${products.length} products`);
    return result;
  },
};

export default filterService;
