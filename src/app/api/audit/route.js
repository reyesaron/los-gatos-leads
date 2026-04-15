import { verifyToken } from "@/lib/auth";
import { queryAuditLog, getAuditFilterOptions } from "@/lib/audit";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    // Admin only
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || payload.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const userEmail = searchParams.get("user") || undefined;
    const startDate = searchParams.get("start") || undefined;
    const endDate = searchParams.get("end") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const filters = searchParams.get("filters");

    if (filters === "true") {
      const options = await getAuditFilterOptions();
      return Response.json(options, { headers: { "Cache-Control": "no-store" } });
    }

    const result = await queryAuditLog({ limit, offset, action, userEmail, startDate, endDate, search });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
