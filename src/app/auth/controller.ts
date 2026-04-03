import type { CookieOptions, Request, Response } from "express";

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
import {
  emailVerificationContent,
  forgotPasswordContent,
  sendEmail,
} from "./utils/mail";
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
      message: "User created successfully. Please Check your mail and verify.",
      data: { id: result?.id },
    });
  }

  public async handleVerifyEmail(req: Request, res: Response) {
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
    //TODO: handle message well like tell user your verification link expired
    if (!isTokenValid) {
      throw ApiError.badRequest("Verification Token Expired or invalid");
    }
    await db
      .update(usersTable)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      })
      .where(eq(usersTable.id, isTokenValid.id));

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
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    };
    ApiResponse.ok({
      res: res
        .cookie("accessToken", accessToken, {
          ...cookieOptions,
          maxAge: 5 * 60 * 1000,
        })
        .cookie("refreshToken", refreshToken, {
          ...cookieOptions,
          maxAge: 24 * 60 * 60 * 1000,
        }),
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
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    };
    ApiResponse.noContent({
      res: res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions),
    });
  }

  public async refreshAccessTokenAndRefreshToken(req: Request, res: Response) {
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

  public async resendVerificationEmail(req: Request, res: Response) {
    const { email } = req.body;
    const [isEmailExists] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!isEmailExists || isEmailExists.emailVerified) {
      return ApiResponse.ok({
        res,
        message: "Verification link sent successfully. Check Inbox",
      });
    }

    const { hashedToken, token, tokenExpiry } = verificationEmailToken();
    await db
      .update(usersTable)
      .set({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: tokenExpiry,
      })
      .where(eq(usersTable.email, email));
    const verificationUrl = `${env.BASE_URL}/verify/${token}`;
    const fullName = `${isEmailExists.firstName} ${isEmailExists.lastName}`;
    const emailContent = emailVerificationContent(fullName, verificationUrl);
    await sendEmail(email, "Verify Email", emailContent);
    ApiResponse.ok({
      res,
      message: "Verification link sent successfully. Check Inbox",
    });
  }

  public async handleForgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!user) {
      return ApiResponse.ok({
        res,
        message: "Reset password link sent successfully. Check Inbox",
      });
    }

    const { hashedToken, token, tokenExpiry } = verificationEmailToken();

    await db
      .update(usersTable)
      .set({
        forgotPasswordToken: hashedToken,
        forgotPasswordTokenExpiry: tokenExpiry,
      })
      .where(eq(usersTable.email, email));

    const verificationUrl = `${env.BASE_URL}/forgot/password/${token}`;
    const fullName = `${user.firstName} ${user.lastName}`;

    await sendEmail(
      user?.email,
      "Verify Email",
      forgotPasswordContent(fullName, verificationUrl),
    );

    ApiResponse.ok({
      res,
      message: "Reset password link sent successfully. Check Inbox",
    });
  }

  public async handleForgotPasswordEmailVerification(
    req: Request,
    res: Response,
  ) {
    const token = req.params.token as string;
    const { newPassword } = req.body;
    const hashedToken = hashToken(token);
    const [isTokenValid] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.forgotPasswordToken, hashedToken),
          gt(usersTable.forgotPasswordTokenExpiry, sql`now()`),
        ),
      );
    //TODO: handle message well like tell user your verification link expired
    if (!isTokenValid) {
      throw ApiError.badRequest("Verification Token Expired or invalid");
    }

    const { salt, hashedPassword } = hashPassword(newPassword, "");
    await db
      .update(usersTable)
      .set({
        forgotPasswordToken: null,
        forgotPasswordTokenExpiry: null,
        password: hashedPassword,
        salt,
      })
      .where(eq(usersTable.id, isTokenValid.id));

    ApiResponse.ok({ res, message: "Password reset successfully" });
  }

  public async handleCurrentPassword(req: Request, res: Response) {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const user = req.user as UserPayload;

    if (newPassword !== confirmNewPassword) {
      throw ApiError.badRequest(
        "New password and confirm password do not match",
      );
    }

    const [userInfo] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    if (!userInfo) {
      throw ApiError.badRequest("user not found");
    }

    // Verify old password
    const { hashedPassword: hashedOldPassword } = hashPassword(
      oldPassword,
      userInfo.salt!,
    );
    if (hashedOldPassword !== userInfo.password) {
      throw ApiError.badRequest("Invalid old password");
    }

    const { salt, hashedPassword } = hashPassword(newPassword, "");

    await db
      .update(usersTable)
      .set({
        password: hashedPassword,
        salt,
      })
      .where(eq(usersTable.id, user.id));

    ApiResponse.ok({ res, message: "Password changed successfully" });
  }
}

export default AuthenticationController;
