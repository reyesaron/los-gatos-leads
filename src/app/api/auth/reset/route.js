import { loadUsers, saveUsers, hashPassword, validatePassword, createToken, sanitizeUser, getClientIP, clearLoginAttempts } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const MAX_CODE_ATTEMPTS = 5;
const GENERIC_FAIL = { error: "Invalid or expired code. Request a new one if needed." };

export async function POST(request) {
  try {
    const { email, code, newPassword, newPasswordConfirm } = await request.json();
    if (!email || !code || !newPassword || !newPasswordConfirm) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }
    const ip = getClientIP(request);
    const ua = request.headers.get("user-agent") || "";

    const users = await loadUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    const user = idx !== -1 ? users[idx] : null;

    if (!user || user.status !== "approved" || !user.resetCodeHash) {
      return Response.json(GENERIC_FAIL, { status: 400 });
    }

    const clearReset = () => {
      delete users[idx].resetCodeHash;
      delete users[idx].resetCodeExpiresAt;
      delete users[idx].resetCodeIssuedAt;
      delete users[idx].resetAttempts;
    };

    if (!user.resetCodeExpiresAt || Date.now() > new Date(user.resetCodeExpiresAt).getTime()) {
      clearReset();
      await saveUsers(users);
      return Response.json(GENERIC_FAIL, { status: 400 });
    }

    if ((user.resetAttempts || 0) >= MAX_CODE_ATTEMPTS) {
      clearReset();
      await saveUsers(users);
      await logAudit({ action: "password_reset_lockout", userEmail: user.email, ip, targetType: "auth", targetId: user.email, details: "Reset code invalidated after 5 wrong attempts", userAgent: ua });
      return Response.json(GENERIC_FAIL, { status: 400 });
    }

    if (!(await bcrypt.compare(String(code).trim(), user.resetCodeHash))) {
      users[idx].resetAttempts = (user.resetAttempts || 0) + 1;
      await saveUsers(users);
      return Response.json(GENERIC_FAIL, { status: 400 });
    }

    const passErr = validatePassword(newPassword);
    if (passErr) return Response.json({ error: passErr }, { status: 400 });
    if (newPassword !== newPasswordConfirm) {
      return Response.json({ error: "Passwords do not match" }, { status: 400 });
    }

    users[idx].passwordHash = await hashPassword(newPassword);
    users[idx].passwordChangedAt = new Date().toISOString();
    users[idx].mustChangePassword = false;
    clearReset();
    await saveUsers(users);

    clearLoginAttempts(email);
    await logAudit({ action: "password_reset_completed", userName: user.name, userEmail: user.email, userRole: user.role, ip, targetType: "auth", targetId: user.email, details: "Password reset via emailed code", userAgent: ua });

    // Sign them in directly — same cookie the login route sets
    const token = createToken(users[idx]);
    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return Response.json({ ok: true, user: sanitizeUser(users[idx]) });
  } catch (err) {
    return Response.json({ error: "Reset failed: " + err.message }, { status: 500 });
  }
}
