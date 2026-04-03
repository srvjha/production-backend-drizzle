import type { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/api-error";
import BaseDto from "../../dto/base.dto";
import { UserPayload, verifyUserToken } from "../auth/utils";

type ValidationTarget = "body" | "params" | "query";

export function authMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken;
    if (!token) {
      req.user = null;
      return next();
    }
    const payload = verifyUserToken(token)
    req.user = payload as UserPayload;
    next();
  };
}

export function restrictToAuthenticatedUser() {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      throw ApiError.unauthorized(
        "You are not authorized to access this resource",
      );
    }
    return next();
  };
}

export function validate(DtoClass: typeof BaseDto, target: ValidationTarget = "body") {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const data = req[target];
      req[target] = await DtoClass.validate(data);
      next();
    } catch (error) {
      next(error);
    }
  };
}
