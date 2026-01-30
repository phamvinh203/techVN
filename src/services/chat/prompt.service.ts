type ProductAny = any;

type ProductContext = {
    productContext: string;
    historyContext: string | null;
    userMessage: string;
    includeShopInfo: boolean;
};

type ConversationMessage = {
    role: string;
    content: string;
};

function wantsSpecificationDetails(message: string | undefined): boolean {
    if (!message) return false;
    const msg = message.toLowerCase();
    return /(cấu hình|cau hinh|chi tiết máy|thông số|spec|specs|cpu|ram|ssd|hdd|gpu|vga|card)/i.test(msg);
}

function formatSpecification(spec: any): string {
    if (!spec) return "Chưa có thông số";
    if (typeof spec === "string") return spec;
    if (Array.isArray(spec)) {
        const cleaned = spec
            .map((v) => (typeof v === "string" ? v.trim() : String(v)))
            .filter((v) => v.length > 0);
        return cleaned.slice(0, 8).join("; ");
    }
    if (typeof spec === "object") {
        const entries = Object.entries(spec)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => {
                const label = String(k).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
                return `${label}: ${typeof v === "string" ? v : JSON.stringify(v)}`;
            })
            .filter((v) => v.length > 0)
            .slice(0, 8);
        if (entries.length === 0) return "Chưa có thông số";
        return entries.join("; ");
    }
    try {
        return JSON.stringify(spec);
    } catch {
        return "Chưa có thông số";
    }
}

const promptService = {
    /**
     * Format product context - KHỚP VỚI SCHEMA SQL
     */
    formatProductContext(products: ProductAny[], userMessage?: string): string {
        const shouldShowSpec = wantsSpecificationDetails(userMessage);

        return products.map((p, i) => {
            // Sử dụng quantity thay vì stock
            const stock = p.quantity > 0 ? `Còn ${p.quantity} máy` : 'Hết hàng';
            const soldInfo = p.sold > 0 ? ` | Đã bán: ${p.sold}` : '';
            const specInfo = shouldShowSpec ? `\nCấu hình: ${formatSpecification(p.specification)}` : '';

            return `${i+1}. ${p.name}
Giá: ${p.price.toLocaleString('vi-VN')}đ
Hãng: ${p.factory || 'N/A'} | Đối tượng: ${p.target || 'Phổ thông'}
Tình trạng: ${stock}${soldInfo}
Mô tả: ${p.short_desc || 'Đang cập nhật'}${specInfo}`;
        }).join("\n\n");
    },

    /**
     * Format conversation history
     */
    formatHistoryContext(history: ConversationMessage[] | null | undefined): string | null {
        if (!history || history.length === 0) return null;

        const recent = history.slice(-5);

        return recent.map(msg => {
            const role = msg.role === 'user' ? 'Khách hỏi' : 'Bot trả lời';
            return `[${role}]: ${msg.content}`;
        }).join("\n");
    },

    /**
     * Build prompt
     */
    buildPrompt({ productContext, historyContext, userMessage, includeShopInfo }: ProductContext): string {
        const needShopInfo = includeShopInfo &&
            /liên hệ|địa chỉ|hotline|phone|sđt|số điện thoại|ship|giao hàng|vận chuyển|thanh toán|bảo hành|đổi trả|chính sách/i.test(userMessage);

        const SHOP_INFO = needShopInfo ? `
╔═══ THÔNG TIN LIÊN HỆ ═══╗
📞 Hotline/Zalo: 0123-456-789
📍 Địa chỉ: 
🚚 Giao hàng: Toàn quốc, freeship >5tr
💳 Thanh toán: Tiền mặt, CK, thẻ, trả góp 0%
🛡️ Bảo hành: Chính hãng 12-24 tháng
╚═══════════════════════╝
` : '';

        const isFirstMessage = !historyContext;

        const SYSTEM_INSTRUCTION = `BẠN LÀ CHUYÊN GIA TƯ VẤN LAPTOP TẠI TechVN

╔═══ QUY TẮC BẮT BUỘC ═══╗
${isFirstMessage ?
`✓ Câu ĐẦU TIÊN: Chào hỏi thân thiện + hỏi nhu cầu
  VD: "Chào bạn! 👋 Mình là Bot tư vấn laptop của TechVN.
       Bạn đang tìm laptop cho mục đích gì và ngân sách khoảng bao nhiêu ạ?"`
:
`✓ ĐANG TRÒ CHUYỆN: TRẢ LỜI TRỰC TIẾP, TUYỆT ĐỐI KHÔNG chào lại!
  ✓ Đọc KỸ lịch sử để hiểu ngữ cảnh
  ✓ "Chiếc đó/này" = sản phẩm vừa đề xuất trong lịch sử
  ✓ Trả lời TIẾP THEO flow, tự nhiên`}

✓ CHỈ giới thiệu sản phẩm CÓ TRONG danh sách
✓ Nếu hết hàng (quantity = 0) → giới thiệu sản phẩm tương tự CÒN HÀNG
✓ KHÔNG bịa đặt thông tin không có
╚═════════════════════╝

╔═══ CHIẾN LƯỢC TƯ VẤN ═══╗
1️⃣ PHÂN LOẠI THEO MỤC ĐÍCH (field "target"):
   • Sinh viên - văn phòng: Nhẹ, pin tốt, giá hợp lý
   • Gaming: Cấu hình mạnh, tản nhiệt tốt
   • Đồ họa - Thiết kế: Màn hình đẹp, RAM cao
   • Doanh nhân: Mỏng nhẹ, cao cấp, bền bỉ

2️⃣ TƯ VẤN THEO NGÂN SÁC:
   • <15tr: Phổ thông, học tập/văn phòng
   • 15-25tr: Tầm trung, gaming nhẹ
   • 25-40tr: Gaming mạnh, chuyên nghiệp
   • >40tr: Cao cấp, workstation

3️⃣ ƯU TIÊN SẢN PHẨM:
   • Còn hàng (quantity > 0)
   • Phù hợp mục đích (target)
   • Trong tầm giá
   • Đã bán nhiều (sold cao) = tin dùng

4️⃣ SO SÁNH & TƯ VẤN:
   • Làm rõ ưu/nhược điểm
   • Giải thích spec đơn giản
   • Đề xuất PHÙ HỢP NHẤT, không ép giá cao
╚════════════════════╝

╔═══ XỬ LÝ SẢN PHẨM HẾT HÀNG ═══╗
✓ Nếu sản phẩm hết hàng:
  - Thông báo: "Mẫu này tạm hết hàng"
  - Đề xuất sản phẩm TƯƠNG TỰ còn hàng
  - Hoặc: "Bạn để lại SĐT, shop báo khi về hàng nhé"
╚═══════════════════════════╝

╔═══ PHONG CÁCH GIAO TIẾP ═══╗
✓ Xưng hô: "mình/bạn" (thân thiện chuyên nghiệp)
✓ Emoji: Vừa phải (👋 💻 ✨ 🔥 ⚡)
✓ Độ dài: 3-5 câu, TỐI ĐA 2-3 sản phẩm/lần
✓ Thiếu info → Hỏi: "Bạn dùng để làm gì và ngân sách bao nhiêu ạ?"
✓ Không rõ → "Mình chưa rõ, bạn gọi hotline nhé!"
╚════════════════════════╝`;

        const historySection = historyContext ? `
╔═══ LỊCH SỬ HỘI THOẠI ═══╗
${historyContext}
╚════════════════════════╝
⚠️ GHI NHỚ NGỮ CẢNH:
- "Chiếc đó/này" → Xem lịch sử biết laptop nào
- "So sánh với cái trước" → So sánh với đã đề xuất
- Khách hỏi thêm → Giải thích CHI TIẾT sản phẩm đã nhắc
` : '';

        return `${SYSTEM_INSTRUCTION}
${SHOP_INFO}
╔═══ DANH SÁCH SẢN PHẨM ═══╗
${productContext}
╚═══════════════════════╝
${historySection}
╔═══ CÂU HỎI MỚI ═══╗
Khách: "${userMessage}"
╚════════════════════╝

${isFirstMessage ? '' : '🚨 ĐANG TRÒ CHUYỆN - ĐỪNG CHÀO LẠI!\n'}
💬 Trả lời:`;
    },

    /**
     * Format response
     */
    formatResponse(rawResponse: string): string {
        return rawResponse
            .trim()
            .replace(/^(Trả lời:|Phản hồi:|Bot:|ChatBot:)/i, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/╔═.*═╗/g, '')
            .replace(/╚═.*═╝/g, '')
            .trim();
    },

    /**
     * THÊM: Helper để lấy sản phẩm còn hàng
     */
    filterAvailableProducts(products: ProductAny[]): ProductAny[] {
        return products.filter(p => p.quantity > 0);
    },

    /**
     * THÊM: Lấy sản phẩm bán chạy
     */
    getBestSellers(products: ProductAny[], limit = 3): ProductAny[] {
        return products
            .filter(p => p.quantity > 0)
            .sort((a, b) => b.sold - a.sold)
            .slice(0, limit);
    },

    /**
     * THÊM: Lọc theo target
     */
    filterByTarget(products: ProductAny[], target: string): ProductAny[] {
        return products.filter(p =>
            p.quantity > 0 &&
            p.target &&
            p.target.toLowerCase().includes(target.toLowerCase())
        );
    }
};

export default promptService;
