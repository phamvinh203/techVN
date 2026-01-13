import { Router } from 'express';
import * as controller from '../controllers/product.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { handleMulterError, uploadProductImageMiddleware } from '~/middlewares/upload.middleware';

const router: Router = Router();



// CRUD sản phẩm (POST, PUT, DELETE) - Yêu cầu xác thực admin
router.post('/', authMiddleware, uploadProductImageMiddleware, handleMulterError, controller.createProduct);
router.put('/:id', authMiddleware, uploadProductImageMiddleware, handleMulterError, controller.updateProduct);
router.delete('/:id', authMiddleware, controller.deleteProduct);

// Cập nhật số lượng sản phẩm trong kho
router.patch('/:id/stock', authMiddleware, controller.updateProductStock);
// ẩn hiện sản phẩm
router.patch('/:id/status', authMiddleware, controller.statusToggleProduct);


// danh sách tất cả sản phẩm với phân trang và lọc
router.get('/', controller.getALLProducts);
// sắp xếp sản phẩm
router.get('/sort', controller.sortProducts);
// sản phẩm nổi bật
router.get('/featured/list', controller.getFeaturedProducts);
// sản phẩm mới nhất
router.get('/new/list', controller.getNewProducts);
// sản phẩm bán chạy nhất
router.get('/top-selling/list', controller.getTopSellingProducts);
// chi tiết sản phẩm theo slug
router.get('/slug/:slug', controller.getProductBySlug);
// sản phẩm theo brand slug
router.get('/brand/:slug', controller.getProductsByBrandSlug);
// api cho hình ảnh Lazy loading
router.get('/:id/images', controller.getProductImages);
// sản phẩm liên quan
router.get('/:id/related', controller.getRelatedProducts);
// chi tiết sản phẩm theo ID (để sau cùng tránh xung đột)
router.get('/:id', controller.getProductById);

export const productsRoutes: Router = router;