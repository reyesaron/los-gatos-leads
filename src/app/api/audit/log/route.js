import { auditFromRequest } from "@/lib/audit-helper";

// POST — log a client-side event (e.g. CSV export)
export async function POST(request) {
  try {
    const body = await request.json();
    await auditFromRequest(request, {
      action: body.action || "unknown",
      targetType: body.targetType || "",
      targetId: body.targetId || "",
      details: body.details || "",
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
