import { verifyToken, sanitizeUser, loadUsers } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return Response.json({ user: null }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return Response.json({ user: null }, { status: 401 });
    }

    // Get fresh user data
    const users = await loadUsers();
    const user = users.find(u => u.id === payload.id);
    if (!user || user.status !== "approved") {
      return Response.json({ user: null }, { status: 401 });
    }

    return Response.json({ user: sanitizeUser(user) });
  } catch {
    return Response.json({ user: null }, { status: 401 });
  }
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  return Response.json({ ok: true });
}
