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

export const supplierRegistrationPendingEmail = async (
  name,
  email,
  cooperativeName
) => {
  const htmlTemplate = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Supplier Registration Under Review</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body
    style="
      background-color: #f8fafc;
      font-family: 'Inter', Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="max-width: 600px; margin: 0 auto;"
    >
      <tr>
        <td style="padding: 40px 20px;">
          <!-- Header with Logo -->
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="text-align: center; padding-bottom: 30px;">
                <!-- Logo -->
                <div style="margin-bottom: 24px;">
                  <img 
                    src="https://xcbgiyiklnoigcixjdxa.supabase.co/storage/v1/object/sign/bayancoop_assets/logo/LogoWithoutName.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zZmZkNmJiZC1hZWZhLTRkZGQtODllZS1kYzhjYzQ0ZGFjNDUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJiYXlhbmNvb3BfYXNzZXRzL2xvZ28vTG9nb1dpdGhvdXROYW1lLnBuZyIsImlhdCI6MTc2MzAyMTcwNSwiZXhwIjoyNDg4MzQ5NzA1fQ.7rKExz2cum9fdkuAtM38rchqwia6nH01eeXg7g-ZGwk" 
                    alt="BayanCoop Logo" 
                    style="max-width: 80px; height: auto; display: block; margin: 0 auto;"
                  />
                </div>
                
                <!-- Status Icon -->
                <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2"/>
                    <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                
                <h1 style="color: #92400e; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">
                  Registration Under Review
                </h1>
              </td>
            </tr>
          </table>

          <!-- Content Card -->
          <div style="background: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); border: 1px solid #f3f4f6;">
            
            <!-- Greeting -->
            <div style="margin-bottom: 24px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Dear <strong style="color: #1f2937;">${name}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                Thank you for registering as a supplier with <strong style="color: #1f2937;">${cooperativeName}</strong>! 
                Your application is currently under review by our team.
              </p>
            </div>

            <!-- Process Timeline -->
            <div style="background: #fffbeb; border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b; margin: 32px 0;">
              <h3 style="color: #92400e; margin: 0 0 16px; font-size: 18px; font-weight: 600;">
                What to Expect Next
              </h3>
              <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                <div style="background: #f59e0b; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                  <span style="color: white; font-size: 12px; font-weight: 600;">1</span>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
                  <strong>Application Review:</strong> Our team will review your application within 1-3 business days
                </p>
              </div>
              <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                <div style="background: #f59e0b; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                  <span style="color: white; font-size: 12px; font-weight: 600;">2</span>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
                  <strong>Approval Notification:</strong> You'll receive an email once your application is approved
                </p>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style="background: #f59e0b; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                  <span style="color: white; font-size: 12px; font-weight: 600;">3</span>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
                  <strong>Get Started:</strong> Upon approval, you can start adding products to our marketplace
                </p>
              </div>
            </div>

            <!-- Application Details -->
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151; font-size: 14px;">Business Name:</strong>
                    <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">${cooperativeName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151; font-size: 14px;">Application Date:</strong>
                    <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">${new Date().toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #374151; font-size: 14px;">Status:</strong>
                    <span style="color: #f59e0b; font-size: 14px; font-weight: 600; margin-left: 8px;">Under Review</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Closing -->
            <div style="text-align: center; margin: 32px 0 24px;">
              <p style="color: #6b7280; font-size: 15px; line-height: 1.5; margin: 0;">
                We appreciate your interest in joining the BayanCoop community and look forward to potentially working with you!
              </p>
            </div>

            <!-- Support Info -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px;">
                Need assistance? Our support team is here to help.
              </p>
              <a href="mailto:support@bayancoop.com" 
                 style="color: #f59e0b; text-decoration: none; font-weight: 600; font-size: 14px;">
                Contact Support
              </a>
            </div>

          </div>

          <!-- Footer -->
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
            <tr>
              <td style="text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; margin: 0;">
                  &copy; ${new Date().getFullYear()} BayanCoop. All rights reserved.<br>
                  Empowering local suppliers and cooperatives.
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const mailOptions = {
    from: process.env.GOOGLE_EMAIL,
    to: email,
    subject: `Your Supplier Application is Under Review - BayanCoop`,
    html: htmlTemplate,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Supplier pending email sent:", info.response);
  } catch (error) {
    console.error("❌ Error sending supplier pending email:", error);
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
