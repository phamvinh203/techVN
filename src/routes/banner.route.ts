import { Router } from "express";
import * as controller from "../controllers/banner.controller";
import { authMiddleware } from "~/middlewares/auth.middleware";

const router: Router = Router();

// Public routes - Lấy banners đang hoạt động
router.get("/active", controller.getActiveBanners);

// Get all banners (có thể filter theo position và isActive)
router.get("/", controller.getAllBanners);

// Get banner by ID
router.get("/:id", controller.getBannerById);

// CRUD banner (POST, PUT, PATCH, DELETE) - Yêu cầu xác thực admin
router.post("/", authMiddleware, controller.createBanner);
router.put("/:id", authMiddleware, controller.updateBanner);
router.patch("/:id/toggle", authMiddleware, controller.toggleBannerStatus);
router.delete("/:id", authMiddleware, controller.deleteBanner);

export const bannerRoutes: Router = router;
