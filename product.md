Viết API getALLProducts.

Query params:
- page (number, default = 1)
- limit (number, default = 10)
- keyword (string, optional)
- category_id (ObjectId, optional)
- brand_id (ObjectId, optional)
- minPrice (number, optional)
- maxPrice (number, optional)
- sort (string: price_asc | price_desc | newest | best_seller)

Xử lý:
- Chỉ lấy product:
  deleted = false
  status = "active"
- Nếu keyword:
  search theo name (regex, không phân biệt hoa thường)
- Lọc theo category_id, brand_id
- Lọc theo price (minPrice, maxPrice)
- Sort:
  - price tăng / giảm
  - mới nhất (createdAt desc)
  - bán chạy (buyturn desc)
- Phân trang bằng skip & limit

Response:
- 200 OK
- Trả về:
  products[]
  totalItems
  totalPages
  currentPage


Viết API getProductById.

Params:
- id (productId)

Xử lý:
- Validate ObjectId
- Lấy product theo _id
- Chỉ lấy nếu:
  deleted = false
  status = "active"
- Populate:
  brand_id
  category_id
- Nếu không tồn tại → 404

Response:
- 200 OK + product
- 404 nếu không tìm thấy

Viết API getFeaturedProducts.

Query params:
- limit (number, default = 8)

Xử lý:
- Lấy product:
  deleted = false
  status = "active"
- Sắp xếp theo:
  buyturn desc
- Giới hạn số lượng theo limit

Response:
- 200 OK
- Trả về danh sách sản phẩm nổi bật


Viết API getNewProducts.

Query params:
- limit (number, default = 8)

Xử lý:
- Lấy product:
  deleted = false
  status = "active"
- Sort:
  createdAt desc
- Limit theo query

Response:
- 200 OK
- Danh sách sản phẩm mới nhất


Viết API getTopSellingProducts.

Query params:
- limit (number, default = 8)

Xử lý:
- Lấy product:
  deleted = false
  status = "active"
- Sort:
  buyturn desc
- Limit theo query

Response:
- 200 OK
- Danh sách sản phẩm bán chạy


Viết API getRelatedProducts.

Params:
- id (productId hiện tại)

Query params:
- limit (number, default = 4)

Xử lý:
- Lấy product hiện tại theo id
- Nếu không tồn tại → 404
- Tìm các product khác:
  - Cùng category_id hoặc brand_id
  - _id != product hiện tại
  - deleted = false
  - status = "active"
- Sort:
  createdAt desc
- Limit theo query

Response:
- 200 OK
- Danh sách sản phẩm liên quan


Viết API getProductImages.

Query params:
- page (number, default = 1)
- limit (number, default = 10)

Xử lý:
- Chỉ select:
  _id
  image
- Lấy product:
  deleted = false
  status = "active"
  image != null
- Phân trang

Response:
- 200 OK
- Trả về:
  images: [{ _id, image }]
  currentPage
  totalPages
