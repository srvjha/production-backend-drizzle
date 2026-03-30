import type { Request, Response } from "express";
import { signinPayloadModel, signupPayloadModel } from "./models";
import { db } from "../../db";
import { usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHmac } from "node:crypto";
import { createUserToken } from "./utils/token";

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
    const [result] = await db
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
      data: { id: result?.id },
    });
  }
  public async handleSignIn(req: Request, res: Response) {
    const validationResult = await signinPayloadModel.safeParseAsync(req.body);
    if (validationResult.error) {
      return res.status(400).json({
        message: "Invalid request body",
        error: validationResult.error.issues,
      });
    }
    const { email, password } = validationResult.data;
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!existingUser) {
      return res.status(404).json({
        error: "Not Found",
        message: `User with this email ${email} not found`,
      });
    }
    const salt = existingUser.salt!;
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    if (hash !== existingUser.password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "email or password is incorrect",
      });
    }
    const token = createUserToken({ id: existingUser.id });
    return res.status(201).json({
      message: "User logged in successfully",
      data: { id: existingUser.id, token },
    });
  }

  public async handleMe(req: Request, res: Response) {
    // @ts-ignore
    const { id } = req.user as UserTokenPayload;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return res.status(200).json({
      message: "User fetched successfully",
      data: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
      },
    });
  }
}

export default AuthenticationController;
