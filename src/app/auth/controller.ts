import type { Request, Response } from "express";

import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  generateAccessAndRefreshToken,
  hashPassword,
  hashToken,
  UserPayload,
  verificationEmailToken,
} from "./utils";
import ApiError from "../../utils/api-error";
import ApiResponse from "../../utils/api-response";
import { env } from "../../config/env";
import { emailVerificationContent, sendEmail } from "./utils/mail";
import JWT from "jsonwebtoken";

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
    const { salt, hashedPassword } = hashPassword(password, "");
    const { hashedToken, token, tokenExpiry } = verificationEmailToken();
    const [result] = await db
      .insert(usersTable)
      .values({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: tokenExpiry,
        salt,
      })
      .returning({ id: usersTable.id });
    const verificationUrl = `${env.BASE_URL}/verify/${token}`;
    const fullName = `${firstName} ${lastName}`;
    const emailContent = emailVerificationContent(fullName, verificationUrl);
    await sendEmail(email, "Verify Email", emailContent);

    ApiResponse.created({
      res,
      message: "User created successfully",
      data: { id: result?.id },
    });
  }

  public async verifyEmail(req: Request, res: Response) {
    const token = req.params.token as string;
    const hashedToken = hashToken(token);
    const [isTokenValid] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.emailVerificationToken, hashedToken),
          gt(usersTable.emailVerificationTokenExpiry, sql`now()`),
        ),
      );
    if (!isTokenValid) {
      throw ApiError.badRequest("Verification Token Expired or invalid");
    }
    await db.update(usersTable).set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    });

    ApiResponse.ok({ res, message: "User verified Successfully" });
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
    if (!existingUser.emailVerified) {
      throw ApiError.badRequest("Please verify your email first");
    }
    const { hashedPassword } = hashPassword(password, existingUser.salt!);
    if (hashedPassword !== existingUser.password) {
      throw ApiError.badRequest("email or password is incorrect");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      existingUser.id,
    );
    ApiResponse.ok({
      res: res
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken),
      message: "User Logged in Succesfully",
    });
  }

  public async handleMe(req: Request, res: Response) {
    const { id } = req.user as UserPayload;
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

  public async handleSignOut(req: Request, res: Response) {
    const { id } = req.user as UserPayload;
    // delete refreshtoken from db
    await db
      .update(usersTable)
      .set({ refreshToken: null })
      .where(eq(usersTable.id, id));
    // now clear the cookie
    ApiResponse.noContent({
      res: res.clearCookie("accessToken").clearCookie("refreshToken"),
    });
  }

  public async handleTokens(req: Request, res: Response) {
    const { refreshToken: incomingRefreshToken } = req.cookies;
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized("Invalid or Expired Token");
    }
    let decoded: { id: string };
    try {
      decoded = JWT.verify(incomingRefreshToken, env.REFRESH_TOKEN_SECRET) as {
        id: string;
      };
    } catch (error) {
      throw ApiError.badRequest("Invalid or expired refresh token");
    }

    const { id } = decoded;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, id),
          eq(usersTable.refreshToken, incomingRefreshToken),
        ),
      );

    if (!user) {
      throw ApiError.unauthorized("Refresh token revoked or invalid");
    }

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(id);
    res.cookie("accessToken", accessToken);
    res.cookie("refreshToken", refreshToken);

    ApiResponse.ok({ res, message: "Tokens refreshed successfully" });
  }
}

export default AuthenticationController;
