import { verifyToken, loadUsers, saveUsers } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";
import { cookies } from "next/headers";

// GET — start Google OAuth flow
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return Response.json({ error: "Session expired" }, { status: 401 });

    const authUrl = getAuthUrl(payload.id);
    return Response.json({ url: authUrl });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — disconnect Google Calendar
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return Response.json({ error: "Session expired" }, { status: 401 });

    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === payload.id);
    if (idx === -1) return Response.json({ error: "User not found" }, { status: 404 });

    delete users[idx].googleTokens;
    users[idx].googleCalendarConnected = false;
    await saveUsers(users);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
