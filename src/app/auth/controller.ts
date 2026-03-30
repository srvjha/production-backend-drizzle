import type { Request, Response } from "express";

import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHmac } from "node:crypto";
import { createUserToken } from "./utils/token";
import ApiError from "../../utils/api-error";
import ApiResponse from "../../utils/api-response";

class AuthenticationController {
  public async handleSignUp(req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existingUser.length > 0) {
      throw ApiError.badRequest("User already exists");
    }
    const salt = randomBytes(32).toString("hex");
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    const [result] = await db
      .insert(usersTable)
      .values({
        firstName,
        lastName,
        email,
        password: hash,
        salt,
      })
      .returning({ id: usersTable.id });

    ApiResponse.created({
      res,
      message: "User created successfully",
      data: { id: result?.id },
    });
  }
  public async handleSignIn(req: Request, res: Response) {
    const { email, password } = req.body;
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!existingUser) {
      throw ApiError.notFound(`User with this email ${email} not found`);
    }
    const salt = existingUser.salt!;
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    if (hash !== existingUser.password) {
      throw ApiError.badRequest("email or password is incorrect");
    }
    const token = createUserToken({ id: existingUser.id });
    ApiResponse.created({
      res,
      message: "User logged in successfully",
      data: { id: existingUser.id, token },
    });
  }

  public async handleMe(req: Request, res: Response) {
    // @ts-ignore
    const { id } = req.user as UserTokenPayload;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user) {
      throw ApiError.unauthorized("Invalid or expired token");
    }
    ApiResponse.ok({
      res,
      message: "User fetched successfully",
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
}

export default AuthenticationController;
