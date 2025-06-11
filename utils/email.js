const nodemailer = require("nodemailer");
const catchAsync = require("./catchAsync");

const sendEmail = catchAsync(async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: {
      name: "Echo",
      address: process.env.GMAIL_USERNAME,
    },
    to: options.email,
    subject: options.subject,
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background-color: #d203fc; padding: 20px; color: #ffffff; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Forgot your password?</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; text-align: center; color: #333;">
                    <p style="font-size: 16px; margin: 0 0 20px;">We received a request to reset your password. Click the button below to choose a new one:</p>
                    <a href="${options.resetURL}"
                       style="display: inline-block; background-color: #d203fc ; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0;">
                      Reset Password
                    </a>
                    <p style="font-size: 14px; color: #666;">If you didn’t request a password reset, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f4f4f7; padding: 20px; text-align: center; font-size: 12px; color: #888;">
                    &copy; 2025 Your App Name. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  };

  transporter.sendMail(mailOptions);
});

module.exports = sendEmail;
