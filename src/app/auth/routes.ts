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
  validate(VerifyEmailDto),
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

export { router as authRoutes };
