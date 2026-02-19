import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to: string, otp: string) {
  console.log(`🚀 Attempting to send OTP email via Resend to: ${to}`);

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
            .logo-circle { width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 16px; line-height: 64px; text-align: center; font-size: 32px; font-weight: bold; color: white; display: block; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px; text-align: center; }
            .header p { margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; text-align: center; }
            .content { padding: 40px 30px; text-align: center; }
            .title { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 16px; text-align: center; }
            .text { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 30px; text-align: center; }
            .otp-box { background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 30px auto; border: 1px solid #bbf7d0; max-width: 250px; text-align: center; }
            .otp-label { margin: 0; color: #15803d; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; text-align: center; }
            .otp-code { font-size: 42px; font-weight: bold; color: #059669; letter-spacing: 8px; margin: 16px 0; font-family: monospace; text-align: center; }
            .expiry { margin: 0; color: #64748b; font-size: 13px; text-align: center; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
            .footer a { color: #059669; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-circle">
                ₦
              </div>
              <h1>TaxNaira</h1>
              <p>Simplify Your Tax Management</p>
            </div>
            <div class="content">
              <div class="title">Verify Your Email</div>
              <p class="text">Welcome to TaxNaira! Please use the verification code below to complete your registration.</p>
              <div class="otp-box">
                <p class="otp-label">Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p class="expiry">Valid for 15 minutes</p>
              </div>
              <p class="text" style="font-size: 14px; margin-bottom: 0;">If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TaxNaira. All rights reserved.</p>
              <p>Secure Tax Filing for Individuals and Businesses</p>
            </div>
          </div>
        </body>
      </html>
    `;

  try {
    const { data, error } = await resend.emails.send({
      from: "TaxNaira <noreply@kraftkonect.com>", // Using default Resend test domain for now
      to: [to],
      subject: "Verify Your Email - TaxNaira",
      html,
    });

    if (error) {
      console.error(`❌ Resend failed to send email to ${to}:`, error);
      // Don't throw, just return null so flow continues (or handle gracefully)
      return null;
    }

    console.log(
      `✅ OTP email sent successfully via Resend to ${to}. MessageId: ${data?.id}`,
    );
    return data;
  } catch (error: any) {
    console.error(`❌ Resend failed to send email to ${to}:`, error.message);
    return null;
  }
}
