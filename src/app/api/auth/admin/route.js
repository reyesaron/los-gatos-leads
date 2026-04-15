import { loadUsers, saveUsers, verifyToken, sanitizeUser, getClientIP } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

// GET — list all users (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await loadUsers();
    return Response.json({ users: users.map(sanitizeUser) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST — approve, reject, or delete users (admin only)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { action, userId } = await request.json();
    if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return Response.json({ error: "User not found" }, { status: 404 });

    if (action === "approve") {
      users[idx].status = "approved";
      users[idx].approvedAt = new Date().toISOString();
      users[idx].approvedBy = payload.name;
    } else if (action === "reject") {
      users[idx].status = "rejected";
      users[idx].rejectedAt = new Date().toISOString();
      users[idx].rejectedBy = payload.name;
    } else if (action === "delete") {
      if (users[idx].id === payload.id) {
        return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
      }
      users.splice(idx, 1);
    } else if (action === "makeAdmin") {
      users[idx].role = "admin";
    } else if (action === "removeAdmin") {
      if (users[idx].id === payload.id) {
        return Response.json({ error: "Cannot remove your own admin role" }, { status: 400 });
      }
      users[idx].role = "user";
    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    await saveUsers(users);

    const targetUser = action === "delete" ? userId : (users[idx]?.name || userId);
    const ip = getClientIP(request);
    await logAudit({ action: `admin_${action}`, userName: payload.name, userEmail: payload.email, userRole: "admin", ip, targetType: "user", targetId: targetUser, details: `Admin ${action}: ${targetUser}`, userAgent: request.headers.get("user-agent") || "" });

    return Response.json({ ok: true, users: users.map(sanitizeUser) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
