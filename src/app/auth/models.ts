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
   static schema = SignUpDto.schema.pick({
    email: true,
    password: true,
  });
}

export class TokenDto extends BaseDto {
  static schema = z.object({
    token: z.string().max(4096),
  });
}

export class EmailDto extends BaseDto{
  static schema = SignUpDto.schema.pick({
    email:true
  })
}

export class ForgotPasswordDto extends BaseDto {
  static schema = SignUpDto.schema.pick({
    email: true,
  });
}

export class ForgotPasswordVerifyDto extends BaseDto {
  static schema = z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  });
}

export class ChangePasswordDto extends BaseDto {
  static schema = z.object({
    oldPassword: z.string().min(8, "Old password must be at least 8 characters long"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmNewPassword: z.string().min(8, "Confirm password must be at least 8 characters long"),
  }).refine(data => data.newPassword === data.confirmNewPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmNewPassword"],
  });
}

export type SignupPayloadModel = z.infer<typeof SignUpDto.schema>;
export type SigninPayloadModel = z.infer<typeof SignInDto.schema>;
export type TokenPayloadModel = z.infer<typeof TokenDto.schema>;
export type EmailPayloadModel = z.infer<typeof EmailDto.schema>;
export type ForgotPasswordPayloadModel = z.infer<typeof ForgotPasswordDto.schema>;
export type ForgotPasswordVerifyPayloadModel = z.infer<typeof ForgotPasswordVerifyDto.schema>;
export type ChangePasswordPayloadModel = z.infer<typeof ChangePasswordDto.schema>;
