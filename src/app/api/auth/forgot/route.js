import { loadUsers, saveUsers, getClientIP, checkResetRateLimit } from "@/lib/auth";
import { mailerConfigured, sendPasswordResetEmail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

// Generic response — identical whether or not the account exists, so this
// endpoint can't be used to probe which emails are registered.
const GENERIC = { ok: true, message: "If that email has an account, a 6-digit code is on its way." };

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
    const ip = getClientIP(request);

    if (checkResetRateLimit(email, ip).blocked) {
      return Response.json({ error: "Too many reset requests. Try again in an hour." }, { status: 429 });
    }

    if (!mailerConfigured()) {
      return Response.json({ error: "Email isn't set up on this server yet — ask your admin to reset your password." }, { status: 503 });
    }

    const users = await loadUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    const user = idx !== -1 ? users[idx] : null;

    // Silently do nothing for unknown/unapproved accounts
    if (!user || user.status !== "approved") return Response.json(GENERIC);

    // Durable cooldown: don't mint a new code within 60s of the last one
    if (user.resetCodeIssuedAt && Date.now() - new Date(user.resetCodeIssuedAt).getTime() < RESEND_COOLDOWN_MS) {
      return Response.json(GENERIC);
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    users[idx].resetCodeHash = await bcrypt.hash(code, 10);
    users[idx].resetCodeExpiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    users[idx].resetCodeIssuedAt = new Date().toISOString();
    users[idx].resetAttempts = 0;
    await saveUsers(users);

    try {
      await sendPasswordResetEmail(user.email, user.name, code);
    } catch (err) {
      await logAudit({ action: "password_reset_email_failed", userEmail: user.email, ip, targetType: "auth", targetId: user.email, details: "SMTP send failed: " + err.message, userAgent: request.headers.get("user-agent") || "" });
      return Response.json({ error: "Couldn't send the reset email right now. Try again in a few minutes or contact your admin." }, { status: 502 });
    }

    await logAudit({ action: "password_reset_requested", userName: user.name, userEmail: user.email, userRole: user.role, ip, targetType: "auth", targetId: user.email, details: "Reset code emailed", userAgent: request.headers.get("user-agent") || "" });

    return Response.json(GENERIC);
  } catch (err) {
    return Response.json({ error: "Request failed: " + err.message }, { status: 500 });
  }
}
