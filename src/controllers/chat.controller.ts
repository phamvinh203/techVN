// chat.controller.ts
import type { Request, Response } from "express";
import chatService from "../services/chat/chat.service";
import { v4 as uuidv4 } from "uuid";
import { ChatSession } from "../models/chat-session.model";

// (Tuỳ chọn) nếu bạn đã có sendSuccess/sendError giống product
import { sendSuccess, sendError } from "../helpers/responese";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type ChatRequestBody = {
  message?: string;
  sessionId?: string;
  // optional flags
  includeShopInfo?: boolean;
  enableAnalytics?: boolean;
  // optional - nếu bạn muốn client gửi để gợi ý greeting
  isGreeting?: boolean;
};

const MAX_MESSAGES = 20;

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ChatRequestBody;
    const { message, sessionId, includeShopInfo, enableAnalytics } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      sendError(res, 400, "message is required");
      return;
    }

    const normalizedSessionId =
      typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId : uuidv4();

    // Get/Create session in DB (TTL handled by index in chat-session.model)
    let session = await ChatSession.findOne({ sessionId: normalizedSessionId });
    let history: ChatMessage[] = (session?.messages as ChatMessage[]) ?? [];
    if (!session) {
      session = new ChatSession({ sessionId: normalizedSessionId, messages: [] });
      history = [];
      console.log(`✨ New session created: ${normalizedSessionId}`);
    }

    console.log(`📝 Session ${normalizedSessionId} - History: ${history.length} messages`);

    // Call chatbot service (Gemini + prompt + filter + cache)
    const reply = await chatService.askChatbot(message, history, {
      includeShopInfo: includeShopInfo !== false,
      enableAnalytics: Boolean(enableAnalytics),
    });

    // Save history (persist to DB)
    const updatedMessages = [
      ...history,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: reply },
    ];

    const trimmedMessages =
      updatedMessages.length > MAX_MESSAGES
        ? updatedMessages.slice(updatedMessages.length - MAX_MESSAGES)
        : updatedMessages;

    session.messages = trimmedMessages;
    session.updatedAt = new Date();
    await session.save();

    sendSuccess(res, {
      message: "Chat thành công",
      data: {
        reply,
        sessionId: normalizedSessionId,
        historyLength: trimmedMessages.length,
      },
    });
  } catch (error) {
    console.error("❌ Chat error:", error);
    sendError(
      res,
      500,
      error instanceof Error ? `Internal server error: ${error.message}` : "Internal server error"
    );
  }
};
