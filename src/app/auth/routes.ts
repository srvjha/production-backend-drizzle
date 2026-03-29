import express from "express";
import type { Router } from "express";
import AuthenticationController from "./controller";
const authController = new AuthenticationController();
const router: Router = express.Router();

router.post("/signup", authController.handleSignUp.bind(authController));

export { router as authRoutes };
