import { z } from "zod";
import BaseDto from "../../dto/base.dto";

export class SignUpDto extends BaseDto {
  static schema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().nullable().optional(),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  });
}

export class SignInDto extends BaseDto {
  static schema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  });
}

export type SignupPayloadModel = z.infer<typeof SignUpDto.schema>;
export type SigninPayloadModel = z.infer<typeof SignInDto.schema>;
