import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_GMAIL_ADDRESS,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});
const devUrl = "http://localhost:5173";

export const sendVerificationEmail = async (name, email, token) => {
  const htmlTemplate = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email - BayanCoop</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif;
      background-color: #f0f8f0;
      margin: 0;
      padding: 0;
    "
  >
    <div
      style="
        background-color: #ffffff;
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border: 2px solid #2e8b57;
      "
    >
      <h1
        style="
          text-align: center;
          color: #2e8b57;
          font-size: 28px;
          margin-bottom: 10px;
          font-weight: bold;
        "
      >
        BayanCoop
      </h1>
      <div
        style="
          text-align: center;
          color: #333333;
          font-size: 16px;
          line-height: 1.5;
          margin: 20px 0;
        "
      >
        <p style="margin: 0; font-size: 18px; color: #2e8b57;">Hello, ${name}</p>
        <p style="margin: 10px 0">
          Welcome to BayanCoop! Thank you for signing up. Please confirm your email address by
          clicking the button below to activate your account:
        </p>
        <a
          href="http://localhost:5173/verify-account/${token}"
          style="
            display: inline-block;
            margin-top: 20px;
            padding: 14px 30px;
            background-color: #2e8b57;
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            border: none;
            cursor: pointer;
          "
          onmouseover="this.style.backgroundColor='#26734d'"
          onmouseout="this.style.backgroundColor='#2e8b57'"
        >
          Verify Email Address
        </a>
        <p style="margin: 20px 0; color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br/>
          <span style="color: #2e8b57; word-break: break-all;">http://localhost:3000/success-verified/${token}</span>
        </p>
        <p style="margin: 20px 0; color: #d9534f; font-size: 14px;">
          This verification link will expire in 1 hour.
        </p>
        <p style="margin: 20px 0; color: #666;">
          If you did not sign up for BayanCoop, please ignore this email.
        </p>
      </div>
      <div
        style="
          text-align: center;
          color: #888888;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        "
      >
        <p style="margin: 5px 0;">Thank you for joining the BayanCoop community.</p>
        <p style="margin: 5px 0;">Together we grow, together we prosper.</p>
        <p style="margin: 5px 0; font-size: 12px; color: #aaaaaa;">
          &copy; 2025 BayanCoop. All rights reserved.
        </p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailoptions = {
    from: process.env.GOOGLE_EMAIL,
    to: email,
    subject: "Verify Your Email - BayanCoop",
    html: htmlTemplate,
  };

  try {
    const info = await transporter.sendMail(mailoptions);
    console.log("✅ BayanCoop verification email sent successfully");
    return info;
  } catch (error) {
    console.error("❌ Error sending BayanCoop email:", error);
    throw error;
  }
};

export const deleteSuccessEmail = async (name, email) => {
  const htmlTemplate = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Account Deleted</title>
  </head>
  <body
    style="
      background-color: #fffacd;
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 20px;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        max-width: 600px;
        margin: auto;
        background: #f4dad1;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      "
    >
      <tr>
        <td style="text-align: center">
          <h1 style="color: #c8a2c8">Account Successfully Deleted</h1>
          <p style="color: #5a5a5a; font-size: 16px">
            Your account and all associated data have been permanently removed.
          </p>
          <p style="color: #5a5a5a; font-size: 14px">
            If this was a mistake or you need assistance, please
            <a
              href="mailto:support@example.com"
              style="color: #b0e0e6; text-decoration: none"
              >contact support</a
            >.
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const mailOptions = {
    from: process.env.GOOGLE_EMAIL,
    to: email,
    subject: "Account Deleted",
    html: htmlTemplate,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};
