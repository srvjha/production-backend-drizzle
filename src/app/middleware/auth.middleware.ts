import type { NextFunction, Request, Response } from "express";
import ApiError from "../../utils/api-error";
import BaseDto from "../../dto/base.dto";
import { UserPayload, verifyUserToken } from "../auth/utils";
<<<<<<< HEAD
=======

type ValidationTarget = "body" | "params" | "query";
>>>>>>> 58fdc9a3c9c3434f59723345178218d32b335a3e

export function authMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken;   
    if (!token) {
<<<<<<< HEAD
      throw ApiError.unauthorized(
        "authorization token is invalid or expired",
      );
=======
      req.user = null;
      return next();
>>>>>>> 58fdc9a3c9c3434f59723345178218d32b335a3e
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
<<<<<<< HEAD
      if(req.body){
      req.body = await DtoClass.validate(req.body);
      } else if(req.params){
        req.params = await DtoClass.validate(req.params);
      }else{
        req.query = await DtoClass.validate(req.query);
      }
=======
      const data = req[target];
      req[target] = await DtoClass.validate(data);
>>>>>>> 58fdc9a3c9c3434f59723345178218d32b335a3e
      next();
    } catch (error) {
      next(error);
    }
  };
}
