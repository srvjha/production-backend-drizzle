import type { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/api-error";
import BaseDto from "../../dto/base.dto";
import { UserPayload, verifyUserToken } from "../auth/utils";

export function authMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken;   
    if (!token) {
      throw ApiError.unauthorized(
        "authorization token is invalid or expired",
      );
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

export function validate(DtoClass: typeof BaseDto) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      if(req.body){
      req.body = await DtoClass.validate(req.body);
      } else if(req.params){
        req.params = await DtoClass.validate(req.params);
      }else{
        req.query = await DtoClass.validate(req.query);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
