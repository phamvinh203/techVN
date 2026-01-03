import { Request, Response, NextFunction } from "express";

export const checkRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as any;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập" });
        }
        next();
    }
}