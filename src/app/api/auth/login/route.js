import { loadUsers, verifyPassword, createToken, sanitizeUser, getClientIP, checkLoginRateLimit, recordLoginFailure, clearLoginAttempts, logLoginEvent } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const ip = getClientIP(request);

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check rate limit before attempting login
    const rateCheck = checkLoginRateLimit(email, ip);
    if (rateCheck.blocked) {
      logLoginEvent("lockout", email, ip, "Account locked — rate limit");
      return Response.json({ error: rateCheck.message }, { status: 429 });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const result = recordLoginFailure(email, ip);
      logLoginEvent("login_failure", email, ip, result.locked ? "Triggered lockout" : `${result.attemptsLeft} attempts left`);
      const msg = result.locked
        ? `Too many failed attempts. Account locked for 15 minutes.`
        : `Invalid email or password. ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? "s" : ""} remaining.`;
      return Response.json({ error: msg }, { status: 401 });
    }

    if (user.status === "pending") {
      return Response.json({ error: "Your account is pending admin approval" }, { status: 403 });
    }

    if (user.status === "rejected") {
      return Response.json({ error: "Your account has been rejected" }, { status: 403 });
    }

    // Successful login — clear failed attempts and log
    clearLoginAttempts(email);
    logLoginEvent("login_success", email, ip, user.name);

    const token = createToken(user);

    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return Response.json({
      ok: true,
      user: sanitizeUser(user),
      mustChangePassword: user.mustChangePassword || false,
    });
  } catch (err) {
    return Response.json({ error: "Login failed: " + err.message }, { status: 500 });
  }
}
