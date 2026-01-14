import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { authMiddleware } from "~/middlewares/auth.middleware";
import { handleMulterError, uploadAvatar } from "~/middlewares/upload.middleware";

const router: Router = Router();
// Auth
router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/refresh-token", controller.refreshToken);

// Password
router.post("/password/forgot", controller.forgotPassword);
router.post("/password/verify-otp", controller.verifyOTP);
router.post("/password/reset", controller.resetPassword);
router.post("/password/resend-otp", controller.resendOTP);

// Logout
router.post("/logout", authMiddleware,controller.logout);

// user profile
router.get("/me", authMiddleware, controller.getMe);
router.put("/me", authMiddleware, controller.updateMe);
router.post("/me/avatar", 
    authMiddleware, 
    uploadAvatar,
    handleMulterError,
    controller.updateAvatar
);
router.put("/me/password", authMiddleware, controller.updatePassword);

router.get("/me/address", authMiddleware, controller.getAddresses);
router.post("/me/address/create", authMiddleware, controller.addAddress);
router.put("/me/address/update/:id", authMiddleware, controller.updateAddress);
router.delete("/me/address/delete/:id", authMiddleware, controller.deleteAddress);


export const userRoutes: Router = router;
