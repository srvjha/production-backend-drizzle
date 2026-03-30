import type { NextFunction, Request, Response } from "express";
import { verifyUserToken } from "../auth/utils/token";

export function authMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const header = req.headers["authorization"];
    if (!header) return next();
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "authorization header should start with Bearer",
      });
    }
    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message:
          "authorization header should start with Bearer followed by token",
      });
    }
    const payload = verifyUserToken(token);
    // @ts-ignore
    req.user = payload;
    next();
  };
}

export function restrictToAuthenticatedUser() {
  return function (req: Request, res: Response, next: NextFunction) {
    // @ts-ignore
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You are not authorized to access this resource",
      });
    }
    return next();
  };
}
