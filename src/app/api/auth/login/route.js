import { loadUsers, verifyPassword, createToken, sanitizeUser, getClientIP } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const ip = getClientIP(request);

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const users = await loadUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "pending") {
      return Response.json({ error: "Your account is pending admin approval" }, { status: 403 });
    }

    if (user.status === "rejected") {
      return Response.json({ error: "Your account has been rejected" }, { status: 403 });
    }

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
    });
  } catch (err) {
    return Response.json({ error: "Login failed: " + err.message }, { status: 500 });
  }
}
