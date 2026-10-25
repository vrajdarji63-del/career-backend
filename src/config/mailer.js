const nodemailer = require('nodemailer');
const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Brevo Client initialization (REST API)
 * Preferred method: Fast, secure, and immune to SMTP port blocks.
 */
let brevoClient = null;
if (process.env.BREVO_API_KEY) {
  brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
}

/**
 * Nodemailer Transporter initialization (SMTP fallback or Gmail/Brevo SMTP)
 */
function createTransporter() {
  const isBrevoSMTP =
    process.env.EMAIL_HOST?.includes('brevo') ||
    process.env.EMAIL_SERVICE?.toLowerCase() === 'brevo' ||
    Boolean(process.env.BREVO_SMTP_KEY);

  if (isBrevoSMTP) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_PASS || process.env.EMAIL_PASS,
      },
    });
  }

  // Generic / Gmail SMTP fallback
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    connectionTimeout: 4000, // Fail quickly if cloud host blocks SMTP ports
    greetingTimeout: 4000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const transporter = createTransporter();

/**
 * Generate email HTML template for OTP verification
 */
function getOTPEmailHtml(otp, firstName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#f0f2ff;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2ff;padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;box-shadow:0 4px 24px rgba(99,102,241,0.12);overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <span style="font-size:28px;">⚡</span>
                  <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">CareerPath <span style="color:#c4b5fd;">AI</span></span>
                </div>
                <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0;">Email Verification (via Brevo)</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${firstName || 'there'}</strong> 👋</p>
                <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 32px;">
                  Use the verification code below to complete your CareerPath AI account registration.
                  This code is valid for <strong>10 minutes</strong>.
                </p>

                <!-- OTP Box -->
                <div style="background:linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.08));border:2px dashed rgba(99,102,241,0.25);border-radius:16px;padding:28px;text-align:center;margin:0 0 32px;">
                  <p style="color:#9ca3af;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px;">Your verification code</p>
                  <p style="font-size:42px;font-weight:800;letter-spacing:14px;color:#4f46e5;margin:0;font-family:'Courier New',monospace;">${otp}</p>
                </div>

                <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
                  <p style="color:#92400e;font-size:13px;margin:0;">
                    🔒 <strong>Security tip:</strong> Never share this code with anyone. CareerPath AI will never ask for it.
                  </p>
                </div>

                <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">
                  © 2026 CareerPath AI · Powered by Brevo Transactional Email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send OTP verification email
 * Prioritizes Brevo API (if BREVO_API_KEY is configured), then Brevo SMTP / Nodemailer.
 */
async function sendOTPEmail(toEmail, otp, firstName) {
  const subject = `${otp} is your CareerPath AI verification code`;
  const htmlContent = getOTPEmailHtml(otp, firstName);
  const textContent = `Hi ${firstName || 'there'},\n\nYour CareerPath AI verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'no-reply@careerpath.ai';
  const senderName = process.env.BREVO_SENDER_NAME || 'CareerPath AI';

  // ── Method 1: Brevo REST API (Recommended) ──────────────────────────────────
  if (process.env.BREVO_API_KEY) {
    try {
      const client = brevoClient || new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
      const response = await client.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent,
        textContent,
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: firstName || 'Student',
          },
        ],
      });

      console.log(`✅ [Brevo API] Verification email sent to ${toEmail}. Message ID:`, response?.messageId || 'OK');
      return response;
    } catch (apiError) {
      console.error('❌ [Brevo API] Error sending email:', apiError.message || apiError);
      // If SMTP is available, fall through to SMTP fallback
      if (!process.env.EMAIL_USER && !process.env.BREVO_SMTP_KEY) {
        throw new Error(apiError.message || 'Failed to send verification email via Brevo API.');
      }
      console.warn('⚠️ Falling back to SMTP transporter...');
    }
  }

  // ── Method 2: Brevo SMTP / Nodemailer Fallback ───────────────────────────────
  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject,
    html: htmlContent,
    text: textContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ [SMTP] Verification email sent to ${toEmail}. Response:`, info.response || info.messageId);
  return info;
}

module.exports = { transporter, sendOTPEmail };
