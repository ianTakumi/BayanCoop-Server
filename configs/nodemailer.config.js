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

export const sendPasswordResetEmail = async (
  name,
  email,
  shortCode,
  resetToken,
  expiresIn
) => {
  const resetLink = `${devUrl}/reset-password/${resetToken}`;
  const deepLink = `bayancoop://reset-password/${resetToken}`;

  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password - BayanCoop</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="background-color: #f0f8f0; font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td style="padding: 40px 20px;">
                <!-- Header -->
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="text-align: center; padding-bottom: 30px;">
                            <!-- Logo -->
                            <div style="margin-bottom: 24px;">
                                <div style="background-color: #2e8b57; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2"/>
                                        <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <h1 style="color: #2e8b57; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">
                                Password Reset
                            </h1>
                            <p style="color: #666; font-size: 16px; margin: 8px 0 0;">
                                BayanCoop Account Security
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Main Content Card -->
                <div style="background: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); border: 2px solid #2e8b57;">
                    
                    <!-- Greeting -->
                    <div style="margin-bottom: 24px;">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                            Hello <strong style="color: #2e8b57;">${name}</strong>,
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                            You requested to reset your password. Here are your reset options:
                        </p>
                    </div>

                    <!-- Option 1: Short Code -->
                    <div style="background: #f0f8f0; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #2e8b57;">
                        <h3 style="color: #2e8b57; margin: 0 0 16px; font-size: 18px; font-weight: 600;">
                            <span style="background: #2e8b57; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 14px;">1</span>
                            Use this verification code
                        </h3>
                        
                        <div style="background: white; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0; border: 2px dashed #2e8b57;">
                            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2e8b57; margin-bottom: 8px;">
                                ${shortCode}
                            </div>
                            <p style="color: #666; font-size: 14px; margin: 0;">
                                6-digit verification code
                            </p>
                        </div>
                        
                        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
                            Enter this code in the password reset page to verify your identity.
                        </p>
                    </div>

                    <!-- Option 2: Reset Link -->
                    <div style="background: #f0f8f0; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #2e8b57;">
                        <h3 style="color: #2e8b57; margin: 0 0 16px; font-size: 18px; font-weight: 600;">
                            <span style="background: #2e8b57; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 14px;">2</span>
                            Click the reset link
                        </h3>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="${resetLink}" 
                               style="display: inline-block; background: linear-gradient(135deg, #2e8b57, #3cb371); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; transition: all 0.3s ease;">
                                Reset Password Now
                            </a>
                        </div>
                        
                        <div style="background: white; border-radius: 8px; padding: 16px; margin-top: 16px;">
                            <p style="color: #666; font-size: 14px; margin: 0 0 8px;">
                                <strong>Or copy this link:</strong>
                            </p>
                            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <code style="color: #2e8b57; font-size: 12px; word-break: break-all;">
                                    ${resetLink}
                                </code>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile App Deep Link -->
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
                        <h4 style="color: #2e8b57; margin: 0 0 12px; font-size: 16px; font-weight: 600;">
                            📱 Mobile App Users
                        </h4>
                        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
                            If you have the BayanCoop mobile app installed, use this deep link:
                        </p>
                        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #2e8b57;">
                            <code style="color: #2e8b57; font-size: 12px; word-break: break-all;">
                                ${deepLink}
                            </code>
                        </div>
                    </div>

                    <!-- Expiration Notice -->
                    <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #ffc107;">
                        <div style="display: flex; align-items: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#856404" stroke-width="2"/>
                                <path d="M12 8V12L14 14" stroke="#856404" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <div>
                                <p style="color: #856404; font-size: 14px; font-weight: 600; margin: 0;">
                                    ⚠️ This reset link will expire in ${expiresIn}
                                </p>
                                <p style="color: #856404; font-size: 13px; margin: 4px 0 0;">
                                    For security reasons, please reset your password before the expiration time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Security Note -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
                        <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 8px;">
                            <strong>Security Note:</strong>
                        </p>
                        <p style="color: #666; font-size: 13px; line-height: 1.5; margin: 0;">
                            If you didn't request this password reset, please ignore this email or contact our support team immediately if you have concerns about your account security.
                        </p>
                    </div>

                </div>

                <!-- Footer -->
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
                    <tr>
                        <td style="text-align: center;">
                            <p style="color: #2e8b57; font-size: 14px; font-weight: 600; margin: 0 0 8px;">
                                BayanCoop
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; margin: 0;">
                                Together we grow, together we prosper.<br>
                                &copy; ${new Date().getFullYear()} BayanCoop. All rights reserved.
                            </p>
                            
                            <div style="margin-top: 20px;">
                                <a href="mailto:support@bayancoop.com" 
                                   style="color: #2e8b57; text-decoration: none; font-weight: 600; font-size: 13px; margin: 0 10px;">
                                    Contact Support
                                </a>
                                <span style="color: #d1d5db;">|</span>
                                <a href="https://bayancoop.com/privacy" 
                                   style="color: #2e8b57; text-decoration: none; font-size: 13px; margin: 0 10px;">
                                    Privacy Policy
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>
</body>
</html>`;

  const textContent = `Password Reset Request - BayanCoop

Hello ${name},

You requested to reset your password. Here are your reset options:

OPTION 1 - Verification Code
Code: ${shortCode}
Enter this 6-digit code in the password reset page.

OPTION 2 - Reset Link
Click this link to reset your password: ${resetLink}

For mobile app users:
Use this deep link: ${deepLink}

⚠️ This reset link will expire in ${expiresIn}.

If you didn't request this password reset, please ignore this email or contact support immediately.

--
BayanCoop
Together we grow, together we prosper
support@bayancoop.com
`;

  const mailOptions = {
    from: process.env.GOOGLE_EMAIL,
    to: email,
    subject: "Reset Your Password - BayanCoop",
    html: htmlTemplate,
    text: textContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ BayanCoop password reset email sent successfully");
    return info;
  } catch (error) {
    console.error("❌ Error sending BayanCoop password reset email:", error);
    throw error;
  }
};

// Add this email function
export const sendPasswordChangeConfirmationEmail = async (name, email) => {
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - BayanCoop</title>
</head>
<body style="background-color: #f0f8f0; font-family: Arial, sans-serif; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 10px; padding: 30px; text-align: center; border: 2px solid #2e8b57;">
      <div style="background-color: #2e8b57; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2"/>
          <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 style="color: #2e8b57;">Password Successfully Changed</h2>
      <p style="color: #666; margin: 20px 0;">Hello ${name},</p>
      <p style="color: #666; margin: 20px 0;">Your BayanCoop account password has been successfully updated.</p>
      <div style="background-color: #f0f8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #2e8b57; margin: 0; font-weight: bold;">If you did not make this change:</p>
        <p style="color: #666; margin: 10px 0 0;">Please contact our support team immediately at <a href="mailto:support@bayancoop.com" style="color: #2e8b57;">support@bayancoop.com</a></p>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated message from BayanCoop security system.</p>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: process.env.GOOGLE_EMAIL,
    to: email,
    subject: "Password Changed - BayanCoop",
    html: htmlTemplate,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Password change confirmation email sent");
  } catch (error) {
    console.error("❌ Error sending password change email:", error);
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
