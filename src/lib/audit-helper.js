import { verifyToken, getClientIP } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { cookies } from "next/headers";

export async function auditFromRequest(request, { action, targetType, targetId, details }) {
  let userName = null, userEmail = null, userRole = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userName = payload.name;
        userEmail = payload.email;
        userRole = payload.role;
      }
    }
  } catch {}

  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "";

  await logAudit({ action, userName, userEmail, userRole, ip, targetType, targetId, details, userAgent });
}
