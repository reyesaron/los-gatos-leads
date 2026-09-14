import nodemailer from "nodemailer";

// Zoho SMTP (admin@bidnexus.us). Host/port/secure have Zoho defaults;
// SMTP_USER + SMTP_PASS (app-specific password) must be set in env.
export function mailerConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.zoho.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendPasswordResetEmail(to, name, code) {
  const transport = getTransport();
  await transport.sendMail({
    from: `"Apex Leads CRM" <${process.env.SMTP_USER}>`,
    to,
    subject: `${code} is your password reset code`,
    text: `Hi ${name},\n\nYour password reset code for the Apex Leads CRM is:\n\n${code}\n\nIt expires in 15 minutes. If you didn't request this, you can ignore this email — your password is unchanged.\n`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="font-size:16px;color:#111">Apex Leads CRM — Password Reset</h2>
        <p style="font-size:14px;color:#333">Hi ${name},</p>
        <p style="font-size:14px;color:#333">Your password reset code is:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:14px 0;text-align:center;color:#111">${code}</div>
        <p style="font-size:12px;color:#777">It expires in 15 minutes. If you didn't request this, ignore this email — your password is unchanged.</p>
      </div>`,
  });
}
