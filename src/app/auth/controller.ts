import type { Request, Response } from "express";
import { signupPayloadModel } from "./models";
import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHmac } from "node:crypto";

class AuthenticationController {
  public async handleSignUp(req: Request, res: Response) {
    const validationResult = await signupPayloadModel.safeParseAsync(req.body);
    if (validationResult.error) {
      return res.status(400).json({
        message: "Invalid request body",
        error: validationResult.error.issues,
      });
    }
    const { firstName, lastName, email, password } = validationResult.data;
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({
        error: "duplicate entry",
        message: "User already exists",
      });
    }
    const salt = randomBytes(32).toString("hex");
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    const result = await db
      .insert(usersTable)
      .values({
        firstName,
        lastName,
        email,
        password: hash,
        salt,
      })
      .returning({ id: usersTable.id });
    return res.status(201).json({
      message: "User created successfully",
      data: { id: result[0]?.id },
    });
  }
}

export default AuthenticationController;
