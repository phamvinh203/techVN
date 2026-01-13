import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { authorizeRoles } from '~/middlewares/auth.middleware';

const router: Router = Router();

// User routes
router.post('/checkout', authMiddleware, orderController.checkout);

router.post('/', authMiddleware, orderController.createOrder);

router.get('/me', authMiddleware, orderController.getMyOrders);

router.get('/:id', authMiddleware, orderController.getOrderById);

router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

// Admin routes
router.get('/admin/all', authMiddleware, authorizeRoles("Admin"), orderController.getAllOrders);

router.put('/admin/:id/status', authMiddleware, authorizeRoles("Admin"), orderController.updateOrderStatus);

export const ordersRoutes: Router = router;
