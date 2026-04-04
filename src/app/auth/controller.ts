import type { CookieOptions, Request, Response } from "express";
import ApiError from "../../utils/api-error";
import ApiResponse from "../../utils/api-response";
import { UserPayload } from "./utils";
import authenticationService from "./services";

class AuthenticationController {
  public async handleSignUp(req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;
    const result = await authenticationService.signUp(
      firstName,
      lastName,
      email,
      password,
    );

    ApiResponse.created({
      res,
      message: "User created successfully. Please Check your mail and verify.",
      data: { id: result.id },
    });
  }

  public async handleVerifyEmail(req: Request, res: Response) {
    const token = req.params.token as string;
    await authenticationService.verifyEmail(token);

    ApiResponse.ok({ res, message: "User verified Successfully" });
  }

  public async handleSignIn(req: Request, res: Response) {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authenticationService.signIn(
      email,
      password,
    );

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    };

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    ApiResponse.ok({
      res,
      message: "User Logged in Succesfully",
      data: { accessToken },
    });
  }

  public async handleMe(req: Request, res: Response) {
    const { id } = req.user as UserPayload;
    const user = await authenticationService.getUser(id);

    ApiResponse.ok({
      res,
      message: "User fetched successfully",
      data: user,
    });
  }

  public async handleSignOut(req: Request, res: Response) {
    const { id } = req.user as UserPayload;
    await authenticationService.signOut(id);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    };

    ApiResponse.noContent({
      res: res.clearCookie("refreshToken", cookieOptions),
    });
  }

  public async refreshToken(req: Request, res: Response) {
    const { refreshToken: incomingRefreshToken } = req.cookies;
    const { accessToken, refreshToken } =
      await authenticationService.refreshTokens(incomingRefreshToken);

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    };

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    ApiResponse.ok({
      res,
      message: "Tokens refreshed successfully",
      data: { accessToken },
    });
  }

  public async resendVerificationEmail(req: Request, res: Response) {
    const { email } = req.body;
    await authenticationService.resendVerificationEmail(email);

    ApiResponse.ok({
      res,
      message: "Verification link sent successfully. Check Inbox",
    });
  }

  public async handleForgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    await authenticationService.forgotPassword(email);

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
    await authenticationService.resetPassword(token, newPassword);

    ApiResponse.ok({ res, message: "Password reset successfully" });
  }

  public async handleCurrentPassword(req: Request, res: Response) {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const user = req.user as UserPayload;

    if (!user) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    if (newPassword !== confirmNewPassword) {
      throw ApiError.badRequest(
        "New password and confirm password do not match",
      );
    }

    await authenticationService.changePassword(
      user.id,
      oldPassword,
      newPassword,
    );

    ApiResponse.ok({ res, message: "Password changed successfully" });
  }
}

export default AuthenticationController;
