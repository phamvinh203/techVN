// chat.controller.ts
import type { Request, Response } from "express";
import chatService from "../services/chat/chat.service";
import { v4 as uuidv4 } from "uuid";
import { ChatSession } from "../models/chat-session.model";
import { sendSuccess, sendError } from "../helpers/responese";
import { ChatMessage } from "../services/chat/types";

type ChatRequestBody = {
  message?: string;
  sessionId?: string;
  includeShopInfo?: boolean;
  enableAnalytics?: boolean;
  isGreeting?: boolean;
};

const MAX_MESSAGES = 20;

export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ChatRequestBody;
    const { message, sessionId, includeShopInfo, enableAnalytics } = body;

    if (!message || typeof message !== "string") {
      sendError(res, 400, "message is required");
      return;
    }

    const normalizedSessionId =
      typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId : uuidv4();

    const session = await ChatSession.findOne({ sessionId: normalizedSessionId })
      .select("messages")
      .lean<{ messages?: ChatMessage[] }>();

    const history: ChatMessage[] = session?.messages ?? [];

    console.log(`📜 Session ${normalizedSessionId} - History: ${history.length} messages`);

    const result = await chatService.askChatbot(message, history, {
      includeShopInfo: includeShopInfo !== false,
      enableAnalytics: Boolean(enableAnalytics),
    });

    const updatedMessages: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: result.reply },
    ].slice(-MAX_MESSAGES);

    await ChatSession.updateOne(
      { sessionId: normalizedSessionId },
      {
        $set: { updatedAt: new Date() },
        $push: {
          messages: {
            $each: updatedMessages.slice(-2),
            $slice: -MAX_MESSAGES,
          },
        },
      },
      { upsert: true }
    );

    sendSuccess(res, {
      message: "Chat thành công",
      data: {
        reply: result.reply,
        product: result.product
          ? {
              id: String(result.product._id ?? ""),
              ...result.product,
            }
          : null,
        sessionId: normalizedSessionId,
        historyLength: updatedMessages.length,
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
