import { ProductForChat } from "./types";

type AnalyticsLog = {
  timestamp: Date;
  user_message: string;
  bot_response: string;
  products_shown: string[];
  products_count: number;
};

function toIdString(p: ProductForChat): string {
  const id = (p as any)?._id;
  if (!id) return "";
  try {
    return typeof id === "string" ? id : String(id);
  } catch {
    return "";
  }
}

function maskPII(text: string): string {
  const maskedEmail = text.replace(
    /([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_match, first, middle, domain) => `${first}${middle ? "***" : ""}${domain}`
  );
  const maskedPhone = maskedEmail.replace(
    /(\+?\d{1,2}\s?)?(\d{3})(\d{3})(\d{3,4})/g,
    (_match, _c, a, b, c) => `${a}***${b}***${c.slice(-2)}`
  );
  return maskedPhone;
}

const analyticsService = {
  async logInteraction(
    userMessage: string,
    botResponse: string,
    relevantProducts: ProductForChat[]
  ): Promise<void> {
    try {
      const productsShown = (relevantProducts || [])
        .map((p) => toIdString(p))
        .filter((x) => x.length > 0);

      const logData: AnalyticsLog = {
        timestamp: new Date(),
        user_message: maskPII(userMessage).slice(0, 400),
        bot_response: botResponse.slice(0, 500),
        products_shown: productsShown,
        products_count: productsShown.length,
      };

      console.log("📊 Analytics:", logData);
      // TODO: persist to DB if needed
    } catch (error) {
      console.error("Analytics error:", error);
    }
  },
};

export default analyticsService;
