import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        email: string;
        role: "Admin" | "User";
        [key: string]: any;
      };
    }
  }
}

export const authMiddleware = (
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET!
    ) as {
      user_id: string;
      email: string;
      role: "Admin" | "User";
    };

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: "Bạn không có quyền thực hiện hành động này" 
            });
        }

        next();
    };
};
