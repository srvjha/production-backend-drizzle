import type { NextFunction, Request, Response } from "express";
import { verifyUserToken } from "../auth/utils/token";
import ApiError from "../../utils/api-error";
import BaseDto from "../../dto/base.dto";

export function authMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const header = req.headers["authorization"];
    if (!header) return next();
    if (!header?.startsWith("Bearer ")) {
      throw ApiError.unauthorized(
        "authorization header should start with Bearer",
      );
    }
    const token = header.split(" ")[1];
    if (!token) {
      throw ApiError.unauthorized(
        "authorization header should start with Bearer followed by token",
      );
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
      throw ApiError.unauthorized(
        "You are not authorized to access this resource",
      );
    }
    return next();
  };
}

export function validate(DtoClass: typeof BaseDto) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      req.body = await DtoClass.validate(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
