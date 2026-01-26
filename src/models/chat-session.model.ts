import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // createdAt tự sinh
);

const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    messages: { type: [ChatMessageSchema], default: [] },

    updatedAt: { type: Date, default: Date.now }, // field dùng TTL
  },
  { versionKey: false }
);

// TTL 15 phút
ChatSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 15 });

export const ChatSession =
  mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);
