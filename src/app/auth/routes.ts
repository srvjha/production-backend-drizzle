import express from "express";
import type { Router } from "express";
import AuthenticationController from "./controller";
import { restrictToAuthenticatedUser } from "../middleware/auth.middleware";
const authController = new AuthenticationController();
const router: Router = express.Router();

router.post("/signup", authController.handleSignUp.bind(authController));
router.post("/signin", authController.handleSignIn.bind(authController));
router.get(
  "/me",
  restrictToAuthenticatedUser(),
  authController.handleMe.bind(authController),
);

export { router as authRoutes };
