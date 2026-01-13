import { Router } from 'express';
import * as cartController from '../controllers/cart.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';

const router: Router = Router();

// Xem giỏ hàng
router.get('/', authMiddleware, cartController.getCart);

// Thêm sản phẩm vào giỏ hàng
router.post('/add', authMiddleware, cartController.addToCart);

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.put('/update', authMiddleware, cartController.updateCartItem);

// Xóa sản phẩm khỏi giỏ hàng
router.delete('/remove/:id', authMiddleware, cartController.removeFromCart);

// Xóa toàn bộ giỏ hàng
router.delete('/clear', authMiddleware, cartController.clearCart);

// Tổng tiền giỏ hàng
router.get('/summary', authMiddleware, cartController.getCartSummary);

export const cartRoutes: Router = router;
