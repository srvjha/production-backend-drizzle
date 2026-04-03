import express from "express";
import type { Router } from "express";
import AuthenticationController from "./controller";
import {
  restrictToAuthenticatedUser,
  validate,
} from "../middleware/auth.middleware";
import { 
  SignUpDto, 
  SignInDto, 
  TokenDto, 
  EmailDto,
  ForgotPasswordDto,
  ForgotPasswordVerifyDto,
  ChangePasswordDto
} from "./models";

const authController = new AuthenticationController();
const router: Router = express.Router();

router.post(
  "/signup",
  validate(SignUpDto),
  authController.handleSignUp.bind(authController),
);
router.get(
  "/verify/email/:token",
  validate(TokenDto, "params"),
  authController.handleVerifyEmail.bind(authController),
);
router.post(
  "/signin",
  validate(SignInDto),
  authController.handleSignIn.bind(authController),
);

router.get(
  "/me",
  restrictToAuthenticatedUser(),
  authController.handleMe.bind(authController),
);

router.get(
  "/signout",
  restrictToAuthenticatedUser(),
  authController.handleSignOut.bind(authController),
);

router.get(
  "/refresh/token",
  authController.refreshAccessTokenAndRefreshToken.bind(authController),
);

router.post(
  "/resend/email",
  validate(EmailDto),
  authController.resendVerificationEmail.bind(authController)
);

router.post(
  "/forgot-password",
  validate(ForgotPasswordDto),
  authController.handleForgotPassword.bind(authController),
);

router.post(
  "/forgot-password/:token",
  validate(TokenDto, "params"),
  validate(ForgotPasswordVerifyDto),
  authController.handleForgotPasswordEmailVerification.bind(authController),
);

router.post(
  "/change-password",
  restrictToAuthenticatedUser(),
  validate(ChangePasswordDto),
  authController.handleCurrentPassword.bind(authController),
);

export { router as authRoutes };
