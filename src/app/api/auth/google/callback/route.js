import { loadUsers, saveUsers } from "@/lib/auth";
import { getTokensFromCode } from "@/lib/google-calendar";
import { redirect } from "next/navigation";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const userId = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return redirect("/?gcal=error&reason=" + error);
    }

    if (!code || !userId) {
      return redirect("/?gcal=error&reason=missing_params");
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Save tokens to user record
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) {
      return redirect("/?gcal=error&reason=user_not_found");
    }

    users[idx].googleTokens = tokens;
    users[idx].googleCalendarConnected = true;
    users[idx].googleCalendarConnectedAt = new Date().toISOString();
    await saveUsers(users);

    return redirect("/?gcal=connected");
  } catch (err) {
    console.error("Google callback error:", err);
    return redirect("/?gcal=error&reason=token_exchange_failed");
  }
}
