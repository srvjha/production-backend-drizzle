import type { CookieOptions } from "express";

import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  generateAccessAndRefreshToken,
  hashPassword,
  hashToken,
  verificationEmailToken,
} from "./utils";
import ApiError from "../../utils/api-error";
import { env } from "../../config/env";
import {
  emailVerificationContent,
  forgotPasswordContent,
  sendEmail,
} from "./utils/mail";
import JWT from "jsonwebtoken";

class AuthenticationService {
  async signUp(firstName: string, lastName: string, email: string, password: string) {
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

    return { id: result?.id };
  }

  async verifyEmail(token: string) {
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
      throw ApiError.badRequest("Email verification link has expired. Please request a new verification link.");
    }

    await db
      .update(usersTable)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      })
      .where(eq(usersTable.id, isTokenValid.id));
  }

  async signIn(email: string, password: string) {
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

    return { accessToken, refreshToken };
  }

  async getUser(id: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async signOut(id: string) {
    await db
      .update(usersTable)
      .set({ refreshToken: null })
      .where(eq(usersTable.id, id));
  }

  async refreshTokens(incomingRefreshToken: string) {
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

    return { accessToken, refreshToken };
  }

  async resendVerificationEmail(email: string) {
    const [isEmailExists] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!isEmailExists || isEmailExists.emailVerified) {
      return;
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
  }

  async forgotPassword(email: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      return;
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
  }

  async resetPassword(token: string, newPassword: string) {
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

    if (!isTokenValid) {
      throw ApiError.badRequest("Password reset link has expired. Please request a new password reset link.");
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
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const [userInfo] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

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
      .where(eq(usersTable.id, userId));
  }
}

export default new AuthenticationService();
