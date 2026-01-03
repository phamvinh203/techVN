import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';

const router: Router = Router();

// Search theo keyword
router.get('/', searchController.searchProducts);

// Lọc sản phẩm theo giá, hãng, danh mục
router.get('/filter', searchController.filterProducts);

// Gợi ý tìm kiếm
router.get('/suggestions', searchController.getSearchSuggestions);

// Lưu lịch sử tìm kiếm (yêu cầu đăng nhập)
router.post('/history', authMiddleware, searchController.saveSearchHistory);

export const searchRoutes: Router = router;
