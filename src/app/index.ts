import express from "express";
import type { Express } from "express";
import { authRoutes } from "./auth/routes";
import { authMiddleware } from "./middleware/auth.middleware";
import { globalErrorHandler } from "./middleware/error.middleware";
import cookies from "cookie-parser";
export function createExpressApplication(): Express {
  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookies());
  app.use(authMiddleware());

  // Routes
  app.get("/", (req, res) => {
    return res.json({
      message: "Welcome to Production Ready Authentication System",
    });
  });
  app.use("/api/v1/auth", authRoutes);
  app.use(globalErrorHandler);

  return app;
}
