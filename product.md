Bạn là Senior Backend Engineer (Node.js + TypeScript + Express + MongoDB/Mongoose). 
Hãy đọc toàn bộ code backend chatbot hiện tại (các file sau) và triển khai thay đổi theo yêu cầu.

FILES:
- chat.controller.ts
- chat.service.ts
- filter.service.ts
- prompt.service.ts
- cache.service.ts
- product.model.ts
- chat-session.model.ts
- chat.route.ts
- gemini.ts
- analytics.service.ts

MỤC TIÊU CHÍNH (BẮT BUỘC):
1) Khi client hỏi kiểu “cho tôi cấu hình/thông số/spec của chiếc <tên sản phẩm>”, 
   backend phải:
   - Tìm đúng sản phẩm được nhắc đến (exact-ish match theo name/slug).
   - Ưu tiên sản phẩm đó trong prompt (chỉ 1 sản phẩm là đủ cho câu hỏi cấu hình).
   - Trả về response JSON kèm thông tin `product` (để client hiển thị card) cùng `reply`.

2) Giảm danh sách sản phẩm đưa vào prompt:
   - Mặc định: chỉ top 3–5 sản phẩm phù hợp nhất (ranking/scoring).
   - Nếu đã match rõ 1 sản phẩm được nhắc tên: chỉ đưa 1 sản phẩm (hoặc 1 + 2 sản phẩm tương tự nếu cần).
   - Không bao giờ đưa 15 sản phẩm vào prompt cho một câu hỏi.

3) Chống trả lời sai dữ liệu:
   - Không bịa spec/giá/feature nếu trong product.specification hoặc description không có.
   - Nếu thiếu field, nói “chưa có thông tin” thay vì tự đoán.

THAY ĐỔI CỤ THỂ CẦN THỰC HIỆN (IMPLEMENT):
A) filter.service.ts
   - Thêm hàm nhận biết “user đang hỏi cấu hình/specific product”:
     + extract tên sản phẩm từ message (các pattern: “cấu hình”, “thông số”, “spec”, “chi tiết”, “review nhanh”…)
     + normalize tiếng Việt (bỏ dấu, lower, bỏ ký tự thừa)
     + tìm best match trong products theo name/slug bằng scoring (exact/contains/token overlap)
     + đặt ngưỡng để tránh match bừa (vd >= 70)
   - Export hàm findMentionedProduct(products, userMessage) -> product | null

B) chat.service.ts
   - Đổi kiểu return từ string sang object:
     type ChatbotResult = { reply: string; product?: ProductForChat | null; products?: ProductForChat[] }
   - Flow mới:
     1) Load products từ cache
     2) mentioned = findMentionedProduct(...)
     3) Nếu mentioned != null:
        relevantProducts = [mentioned]
        selectedProduct = mentioned
        log “Matched product: <name>”
     4) Nếu mentioned == null:
        relevantProducts = rank/filter rồi slice top 3–5
     5) Build prompt:
        - Nếu selectedProduct: add block “SẢN PHẨM ĐƯỢC CHỌN”
        - Else: “DANH SÁCH SẢN PHẨM LIÊN QUAN (TOP N)”
     6) Call Gemini
     7) Save session (giữ logic hiện tại)
     8) Return { reply, product: selectedProduct ?? null }

C) prompt.service.ts
   - Thêm rules:
     - Nếu có “SẢN PHẨM ĐƯỢC CHỌN”, bắt buộc trả lời dựa vào nó, không được thay bằng sản phẩm khác.
     - Không bịa thông số; thiếu thì nói “chưa có thông tin”.
     - Giới hạn list sản phẩm: tối đa 5.
   - Prompt phải ngắn gọn, tránh token dư.

D) chat.controller.ts
   - Response JSON phải trả kèm product khi có:
     data: {
       reply,
       product: { id, name, slug, price, oldprice, images, specification, quantity, buyturn, ... } | null,
       sessionId,
       historyLength
     }
   - Không đổi route/payload đầu vào (giữ {message, sessionId})

RÀNG BUỘC:
- Không sử dụng field không tồn tại trong product schema.
- Không đổi API input contract.
- Code phải compile TypeScript.
- Comment tiếng Việt ở đoạn matching/ranking quan trọng.
- Nếu cần tạo file mới (types/productForChat.ts hoặc utils/normalize.ts), hãy tạo và cập nhật import rõ ràng.

OUTPUT BẮT BUỘC:
1) Tóm tắt thay đổi 8–12 dòng (những gì đã làm).
2) Patch theo từng file (✅ filename.ts) và đưa NỘI DUNG FILE HOÀN CHỈNH sau khi sửa.
3) 5 test case (input JSON -> expected: reply + product present/absent + number of products in prompt).

BẮT ĐẦU:
Hãy đọc code hiện tại, sau đó thực hiện thay đổi và xuất patch đúng format.
