import { loadUsers, saveUsers, verifyPassword, hashPassword, validatePassword, verifyToken, getClientIP } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return Response.json({ error: "Session expired" }, { status: 401 });

    const { currentPassword, newPassword, newPasswordConfirm } = await request.json();

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (newPassword !== newPasswordConfirm) {
      return Response.json({ error: "New passwords do not match" }, { status: 400 });
    }

    const passErr = validatePassword(newPassword);
    if (passErr) return Response.json({ error: passErr }, { status: 400 });

    const users = await loadUsers();
    const userIdx = users.findIndex(u => u.id === payload.id);
    if (userIdx === -1) return Response.json({ error: "User not found" }, { status: 404 });

    const user = users[userIdx];
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    users[userIdx].passwordHash = await hashPassword(newPassword);
    users[userIdx].passwordChangedAt = new Date().toISOString();
    users[userIdx].mustChangePassword = false;
    await saveUsers(users);

    const ip = getClientIP(request);
    await logAudit({ action: "password_change", userName: payload.name, userEmail: payload.email, userRole: payload.role, ip, targetType: "auth", targetId: payload.email, details: "Password changed", userAgent: request.headers.get("user-agent") || "" });

    return Response.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    return Response.json({ error: "Password change failed: " + err.message }, { status: 500 });
  }
}
