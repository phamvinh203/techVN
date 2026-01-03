import { Router } from "express";
import * as controller from "../controllers/categories.controller";
import { authMiddleware } from "~/middlewares/auth.middleware";

const router: Router = Router();

// Get all categories
router.get("/", controller.getAllCategories);
// Chi tiết category
router.get("/:id", controller.getCategoryById);

// CRUD category (POST, PUT, DELETE) - Yêu cầu xác thực  admin
router.post("/", authMiddleware, controller.createCategory);
router.put("/:id", authMiddleware, controller.updateCategory);
router.delete("/:id", authMiddleware, controller.deleteCategory);

export const categoriesRoutes: Router = router;