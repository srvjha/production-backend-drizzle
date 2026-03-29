import express from "express";
import type { Express } from "express";
import { authRoutes } from "./auth/routes";
export function createExpressApplication(): Express {
  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.get("/", (req, res) => {
    return res.json({ message: "Welcome bhai" });
  });
  app.use("/auth", authRoutes);

  return app;
}
