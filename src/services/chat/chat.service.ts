import cacheService from "./cache.service";
import filterService from "./filter.service";
import analyticsService from "./analytics.service";
import promptService from "./prompt.service";
import askGemini from "~/config/gemini";
import { ChatMessage, ChatbotResult, ProductForChat } from "./types";

export type AskChatbotOptions = {
  includeShopInfo?: boolean; // default true
  enableAnalytics?: boolean; // default false
};

const chatService = {
  /**
   * Main chatbot function
   */
  async askChatbot(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    options: AskChatbotOptions = {}
  ): Promise<ChatbotResult> {
    try {
      const validation = filterService.validateInput(userMessage);
      if (!validation.valid) {
        return { reply: validation.message, product: null };
      }

      if (filterService.isPromptInjection(userMessage)) {
        return {
          reply:
            "Mình chỉ hỗ trợ tư vấn laptop trong phạm vi danh mục có sẵn, bạn hỏi thử nhu cầu và ngân sách nhé! 😊",
          product: null,
        };
      }

      const products: ProductForChat[] = await cacheService.getProducts();

      const mentioned = filterService.findMentionedProduct(products, userMessage);

      let selectedProduct: ProductForChat | null = null;
      let relevantProducts: ProductForChat[] = [];

      if (mentioned) {
        selectedProduct = mentioned;
        relevantProducts = [mentioned];
        console.log(`✅ Matched product: ${mentioned.name}`);
      } else {
        relevantProducts = filterService.filterRelevantProducts(products, userMessage).slice(0, 5);
      }

      const productContext = promptService.formatProductContext(relevantProducts, userMessage);
      const historyContext = promptService.formatHistoryContext(conversationHistory);

      const prompt = promptService.buildPrompt({
        productContext,
        historyContext,
        userMessage,
        includeShopInfo: options.includeShopInfo !== false,
        selectedProduct,
      });

      const response = await askGemini(prompt);

      if (!response || response.trim().length === 0) {
        return {
          reply:
            "Xin lỗi bạn, mình đang gặp chút vấn đề kỹ thuật. Bạn thử hỏi lại sau vài giây nhé! 🙏",
          product: selectedProduct,
        };
      }

      if (options.enableAnalytics) {
        await analyticsService.logInteraction(userMessage, response, relevantProducts);
      }

      return {
        reply: promptService.formatResponse(response),
        product: selectedProduct ?? null,
        products: relevantProducts,
      };
    } catch (error) {
      console.error("❌ Chatbot Error:", error);
      return {
        reply:
          "Ôi, có lỗi xảy ra rồi. Bạn có thể liên hệ hotline 0123-456-789 để được hỗ trợ trực tiếp nhé! 📞",
        product: null,
      };
    }
  },

  clearCache(): void {
    cacheService.clearCache();
  },
};

export default chatService;
