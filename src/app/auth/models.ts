import { z } from "zod";

export const signupPayloadModel = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().nullable().optional(),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type SignupPayloadModel = z.infer<typeof signupPayloadModel>;
