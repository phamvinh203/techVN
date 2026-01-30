import { ProductLean } from "../product.service";


type AnalyticsLog = {
  timestamp: Date;
  user_message: string;
  bot_response: string;
  products_shown: string[];
  products_count: number;
};

function toIdString(p: any): string {
  // Mongo lean object thường có _id
  const id = p?._id ?? p?.id;
  if (!id) return "";
  try {
    return typeof id === "string" ? id : String(id);
  } catch {
    return "";
  }
}

const analyticsService = {
  /**
   * Log interaction cho analytics
   * (hiện tại: console.log; sau này có thể lưu DB)
   */
  async logInteraction(
    userMessage: string,
    botResponse: string,
    relevantProducts: ProductLean[]
  ): Promise<void> {
    try {
      const productsShown = (relevantProducts || [])
        .map((p) => toIdString(p))
        .filter((x) => x.length > 0);

      const logData: AnalyticsLog = {
        timestamp: new Date(),
        user_message: userMessage,
        bot_response: botResponse,
        products_shown: productsShown,
        products_count: productsShown.length,
      };

      console.log("📊 Analytics:", logData);

      // TODO: Lưu vào database nếu bạn muốn
      // Ví dụ (Mongo):
      // await ChatLog.create(logData);

    } catch (error) {
      console.error("Analytics error:", error);
      // Không throw error để không ảnh hưởng trải nghiệm chat
    }
  },
};

export default analyticsService;
