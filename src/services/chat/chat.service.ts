import cacheService from "./cache.service";
import filterService from "./filter.service";
import analyticsService from "./analytics.service";
import promptService from "./prompt.service";
import askGemini from "~/config/gemini";

// ===== Types =====
export type ChatRole = "user" | "assistant";

export type ConversationMessage = {
  role: ChatRole;
  content: string;
};

export type AskChatbotOptions = {
  includeShopInfo?: boolean;   // default true
  enableAnalytics?: boolean;   // default false
};

type ProductAny = any;

const chatService = {
  /**
   * Main chatbot function
   * @param userMessage - Tin nhắn từ user
   * @param conversationHistory - Lịch sử chat [{ role: 'user'|'assistant', content: '...' }]
   * @param options - Tùy chọn bổ sung
   */
  async askChatbot(
    userMessage: string,
    conversationHistory: ConversationMessage[] = [],
    options: AskChatbotOptions = {}
  ): Promise<string> {
    try {
      // 1) VALIDATE INPUT
      const validation = filterService.validateInput(userMessage);
      if (!validation.valid) {
        return validation.message as string;
      }

      // 2) GET PRODUCTS (with cache)
      const products: ProductAny[] = await cacheService.getProducts();

      // 3) FILTER RELEVANT PRODUCTS (reduce context length)
      const relevantProducts: ProductAny[] = filterService.filterRelevantProducts(products, userMessage);

      // 4) BUILD CONTEXT
      const productContext = promptService.formatProductContext(relevantProducts, userMessage);
      const historyContext = promptService.formatHistoryContext(conversationHistory);

      // 5) BUILD PROMPT
      const prompt = promptService.buildPrompt({
        productContext,
        historyContext,
        userMessage,
        includeShopInfo: options.includeShopInfo !== false, // default true
      });

      // 6) CALL GEMINI
      const response = await askGemini(prompt);

      // 7) VALIDATE & FORMAT RESPONSE
      if (!response || response.trim().length === 0) {
        return "Xin lỗi bạn, mình đang gặp chút vấn đề kỹ thuật. Bạn thử hỏi lại sau vài giây nhé! 🙏";
      }

      // 8) LOG ANALYTICS (optional)
      if (options.enableAnalytics) {
        await analyticsService.logInteraction(userMessage, response, relevantProducts);
      }

      return promptService.formatResponse(response);
    } catch (error) {
      console.error("❌ Chatbot Error:", error);
      return "Ối, có lỗi xảy ra rồi. Bạn có thể liên hệ hotline 0123-456-789 để được hỗ trợ trực tiếp nhé! 📞";
    }
  },

  /**
   * Clear cache (gọi khi update products)
   */
  clearCache(): void {
    cacheService.clearCache();
  },
};

export default chatService;
