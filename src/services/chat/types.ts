export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  createdAt?: Date;
};

export type ProductForChat = {
  _id: unknown;
  name: string;
  slug?: string;
  price: number;
  oldprice?: number;
  images?: string[];
  description?: string;
  specification?: Record<string, unknown> | string | null;
  buyturn?: number;
  quantity?: number;
  brandName?: string;
  categoryName?: string;
  status?: "active" | "inactive";
  deleted?: boolean;
};

export type ChatbotResult = {
  reply: string;
  product?: ProductForChat | null;
  products?: ProductForChat[];
};
