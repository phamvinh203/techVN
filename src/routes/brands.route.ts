import { Router } from 'express';
import * as controller from '../controllers/brands.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';

const router: Router = Router();

// Get all brands
router.get("/", controller.getAllBrands);
// Get brand by ID
router.get("/:id", controller.getBrandById);

// CRUD brand (POST, PUT, DELETE) - Requires admin authentication
router.post("/", authMiddleware, controller.createBrand);
router.put("/:id", authMiddleware, controller.updateBrand);
router.delete("/:id", authMiddleware, controller.deleteBrand);

export const brandsRoutes: Router = router;