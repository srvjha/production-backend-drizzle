 import { Resend } from "resend";
import { env } from "../../../config/env";
import ApiError from "../../../utils/api-error";


const resend = new Resend(env.RESEND_API_KEY);

const sendEmail = async (
  email: string,
  subject: string,
  htmlContent: string
) => {
  try {
    await resend.emails.send({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`, 
      to: email,
      subject: subject,
      html: htmlContent,
    });
  } catch (error: any) {
     console.error("Error while sending mail: ", error);
    throw new ApiError(500,"Email service failed. Check your RESEND credentials and setup.")
   
  }
};

const emailVerificationContent = (fullName: string, verificationUrl: string) => {
  return `
  <div style="background-color:#f4f7fb; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
      
      <div style="background:#0b3d91; padding:20px; text-align:center; color:white;">
        <h1 style="margin:0;">Welcome 🚀</h1>
      </div>

      <div style="padding:30px; color:#333;">
        <h2 style="margin-top:0;">Hi ${fullName},</h2>
        <p>We're excited to have you on board! Please verify your email address to get started.</p>

        <div style="text-align:center; margin:30px 0;">
          <a href="${verificationUrl}" 
             style="background:#0b3d91; color:white; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold;">
            Verify Email
          </a>
        </div>

        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all; color:#0b3d91;">${verificationUrl}</p>

        <p>If you didn’t create an account, you can safely ignore this email.</p>
      </div>

      <div style="background:#f1f5f9; padding:20px; text-align:center; font-size:12px; color:#666;">
        <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
      </div>

    </div>
  </div>
  `;
};


const forgotPasswordContent = (fullName: string, passwordResetUrl: string) => {
  return `
  <div style="background-color:#f4f7fb; padding:40px 0; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
      
      <div style="background:#0b3d91; padding:20px; text-align:center; color:white;">
        <h1 style="margin:0;">Password Reset 🔐</h1>
      </div>

      <div style="padding:30px; color:#333;">
        <h2 style="margin-top:0;">Hi ${fullName},</h2>
        <p>We received a request to reset your password.</p>

        <div style="text-align:center; margin:30px 0;">
          <a href="${passwordResetUrl}" 
             style="background:#0b3d91; color:white; padding:12px 20px; text-decoration:none; border-radius:6px; font-weight:bold;">
            Reset Password
          </a>
        </div>

        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all; color:#0b3d91;">${passwordResetUrl}</p>

        <p>If you didn’t request this, you can ignore this email.</p>
      </div>

      <div style="background:#f1f5f9; padding:20px; text-align:center; font-size:12px; color:#666;">
        <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
      </div>

    </div>
  </div>
  `;
};

export {
  emailVerificationContent,
  forgotPasswordContent,
  sendEmail,
};