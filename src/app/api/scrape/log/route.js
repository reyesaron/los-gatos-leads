import { logAudit } from "@/lib/audit";

// POST /api/scrape/log — log a scraper run result from GitHub Actions
export async function POST(request) {
  try {
    const body = await request.json();
    const { scraper, status, projectCount, newCount, errors, duration, token } = body;

    // Simple auth — only accept calls with the scraper token
    if (token !== process.env.SCRAPER_LOG_TOKEN) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!scraper) {
      return Response.json({ error: "scraper name required" }, { status: 400 });
    }

    const details = [
      `Status: ${status || "unknown"}`,
      projectCount !== undefined ? `Projects: ${projectCount}` : null,
      newCount !== undefined ? `New: ${newCount}` : null,
      duration ? `Duration: ${duration}s` : null,
      errors?.length ? `Errors: ${errors.join("; ")}` : null,
    ].filter(Boolean).join(" · ");

    await logAudit({
      action: `scraper_${status === "success" ? "success" : "failure"}`,
      userName: "github-actions[bot]",
      userEmail: "scraper@system",
      userRole: "system",
      ip: request.headers.get("x-forwarded-for") || "github-actions",
      targetType: "scraper",
      targetId: scraper,
      details,
      userAgent: request.headers.get("user-agent") || "GitHub-Actions",
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/scrape/log — get recent scraper runs (for the CRM dashboard)
export async function GET(request) {
  try {
    const { queryAuditLog } = await import("@/lib/audit");
    const result = await queryAuditLog({
      limit: 20,
      action: undefined,
      search: "scraper",
    });

    // Filter to just scraper entries
    const scraperRuns = result.entries.filter(e =>
      e.action === "scraper_success" || e.action === "scraper_failure"
    );

    return Response.json({ runs: scraperRuns }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
