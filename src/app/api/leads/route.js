import { put, list } from "@vercel/blob";
import { auditFromRequest } from "@/lib/audit-helper";
import { verifyToken, loadUsers, saveUsers } from "@/lib/auth";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, refreshTokensIfNeeded } from "@/lib/google-calendar";
import { cookies } from "next/headers";

const BLOB_NAME = "leads-crm.json";

async function loadCRM() {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return {};
    // Cache-bust: append timestamp to avoid CDN serving stale data
    const url = blobs[0].url + (blobs[0].url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return {};
  }
}

async function saveCRM(data) {
  await put(BLOB_NAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// GET /api/leads — fetch CRM data for all leads (or a specific one)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("id");
    const crm = await loadCRM();

    const headers = { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" };

    if (leadId) {
      const entry = crm[leadId] || { status: "New", notes: [] };
      return Response.json({ lead: entry, notes: entry.notes || [] }, { headers });
    }

    return Response.json({ leads: crm }, { headers });
  } catch (err) {
    return Response.json({ error: "Failed to load: " + err.message }, { status: 500 });
  }
}

// POST /api/leads — update lead status, add notes
export async function POST(request) {
  const body = await request.json();
  const { leadId, action } = body;

  if (!leadId) {
    return Response.json({ error: "leadId required" }, { status: 400 });
  }

  const crm = await loadCRM();
  if (!crm[leadId]) crm[leadId] = { status: "New", notes: [] };
  const entry = crm[leadId];

  if (action === "updateStatus") {
    if (body.status) entry.status = body.status;
    if (body.assignee !== undefined) entry.assignee = body.assignee;
    entry.updatedAt = new Date().toISOString();
  }

  else if (action === "addNote") {
    const { note, author } = body;
    if (!note || !author) {
      return Response.json({ error: "note and author required" }, { status: 400 });
    }
    if (!entry.notes) entry.notes = [];
    entry.notes.unshift({
      text: note,
      author,
      timestamp: new Date().toISOString(),
    });
    entry.lastContactBy = author;
    entry.lastContactAt = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
  }

  else if (action === "setFollowUp") {
    entry.followUpDate = body.followUpDate || "";
    entry.followUpAssignee = body.assignee || "";
    entry.updatedAt = new Date().toISOString();

    // Google Calendar integration
    try {
      const cookieStore = await cookies();
      const authToken = cookieStore.get("auth-token")?.value;
      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload) {
          const users = await loadUsers();
          // Find the target user: assigned user first, then current user
          const assignee = entry.assignee ? users.find(u => u.name === entry.assignee) : null;
          const currentUser = users.find(u => u.id === payload.id);
          const calUser = (assignee?.googleCalendarConnected ? assignee : currentUser?.googleCalendarConnected ? currentUser : null);

          if (calUser?.googleTokens) {
            const tokens = await refreshTokensIfNeeded(calUser.googleTokens);
            if (tokens !== calUser.googleTokens) {
              const uidx = users.findIndex(u => u.id === calUser.id);
              if (uidx >= 0) { users[uidx].googleTokens = tokens; await saveUsers(users); }
            }

            const address = body.leadAddress || leadId;
            const scope = body.leadScope || "";

            if (body.followUpDate) {
              if (entry.calendarEventId) {
                // Update existing event
                await updateCalendarEvent(tokens, entry.calendarEventId, {
                  address, scope, notes: entry.notes?.[0]?.text || "",
                  followUpDate: body.followUpDate,
                });
              } else {
                // Create new event
                const event = await createCalendarEvent(tokens, {
                  address, scope, notes: entry.notes?.[0]?.text || "",
                  followUpDate: body.followUpDate,
                });
                entry.calendarEventId = event.id;
              }
            } else if (entry.calendarEventId) {
              // Follow-up cleared — delete the event
              await deleteCalendarEvent(tokens, entry.calendarEventId);
              delete entry.calendarEventId;
            }
          }
        }
      }
    } catch (err) {
      // Best effort — don't fail the follow-up save if calendar fails
      console.error("Calendar event error:", err.message);
    }
  }

  else if (action === "setEstValue") {
    entry.estValue = body.estValue || 0;
    entry.updatedAt = new Date().toISOString();
  }

  else if (action === "setSource") {
    if (body.source !== undefined) entry.leadSource = body.source;
    if (body.sourceNote !== undefined) entry.sourceNote = body.sourceNote;
    entry.updatedAt = new Date().toISOString();
  }

  else if (action === "setContact") {
    if (body.contactName !== undefined) entry.contactName = body.contactName;
    if (body.contactPhone !== undefined) entry.contactPhone = body.contactPhone;
    if (body.contactEmail !== undefined) entry.contactEmail = body.contactEmail;
    if (body.contactRole !== undefined) entry.contactRole = body.contactRole;
    entry.updatedAt = new Date().toISOString();
  }

  else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    await saveCRM(crm);
  } catch (err) {
    return Response.json({ error: "Failed to save: " + err.message }, { status: 500 });
  }

  // Audit log
  await auditFromRequest(request, {
    action: `lead_${action}`,
    targetType: "lead",
    targetId: leadId,
    details: action === "updateStatus" ? `Status → ${body.status || ""}, Assignee → ${body.assignee || ""}` :
             action === "addNote" ? `Note by ${body.author}: ${(body.note || "").slice(0, 80)}` :
             action === "setFollowUp" ? `Follow-up: ${body.followUpDate || "cleared"}` :
             action === "setEstValue" ? `Est. value: $${body.estValue || 0}` :
             action === "setSource" ? `Source: ${body.source || ""}` :
             action === "setContact" ? `Contact: ${body.contactName || ""} (${body.contactRole || ""})` :
             action,
  });

  return Response.json({ ok: true, lead: entry, notes: entry.notes || [] });
}
