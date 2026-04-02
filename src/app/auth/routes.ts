import express from "express";
import type { Router } from "express";
import AuthenticationController from "./controller";
import {
  restrictToAuthenticatedUser,
  validate,
} from "../middleware/auth.middleware";
import { SignUpDto, SignInDto, VerifyEmailDto } from "./models";

const authController = new AuthenticationController();
const router: Router = express.Router();

router.post(
  "/signup",
  validate(SignUpDto),
  authController.handleSignUp.bind(authController),
);
router.get(
  "/verify/email/:token",
  validate(VerifyEmailDto, "params"),
  authController.verifyEmail.bind(authController),
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

router.get("/refresh/token", authController.handleTokens.bind(authController));

export { router as authRoutes };
