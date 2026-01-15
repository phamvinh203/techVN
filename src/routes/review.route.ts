import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { authorizeRoles } from '~/middlewares/auth.middleware';

const router: Router = Router();


/**
 * User tạo review (phải login)
 */
router.post(
  "/",
  authMiddleware,
  authorizeRoles("USER"),
  reviewController.createReview
);

/**
 * Public: lấy review của sản phẩm
 */
router.get(
  "/products/:id/reviews",
  reviewController.getProductReviews
);


/**
 * Admin reply review
 */
router.post(
  "/:id/reply",
  authMiddleware,
  authorizeRoles("ADMIN"),
  reviewController.adminReplyReview
);

// GET    /reviews/admin/all         → Tất cả reviews (admin)
router.get(
  "/admin/all",
  authMiddleware,
  authorizeRoles("ADMIN"),
  reviewController.getAllReviewsAdmin
);

// PATCH  /reviews/admin/:id/toggle-hide → Ẩn/hiện review (admin)
router.patch(
  "/admin/:id/toggle-hide",
  authMiddleware,
  authorizeRoles("ADMIN"),
  reviewController.toggleHideReview
);


/**
 * Admin: Lấy tất cả reviews với filter và pagination
 * Query params:
 *  - page: số trang (default: 1)
 *  - limit: số item/trang (default: 10)
 *  - rating: lọc theo rating (1-5)
 *  - is_hidden: lọc theo trạng thái ẩn (true/false)
 *  - has_reply: lọc theo đã reply chưa (true/false)
 *  - sort_by: field để sort (default: createdAt)
 *  - sort_order: asc/desc (default: desc)
 */



export const reviewRoutes: Router = router;