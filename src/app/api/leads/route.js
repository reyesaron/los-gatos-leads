import { put, list } from "@vercel/blob";

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
  });
}

// GET /api/leads — fetch CRM data for all leads (or a specific one)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("id");
  const crm = await loadCRM();

  if (leadId) {
    const entry = crm[leadId] || { status: "New", notes: [] };
    return Response.json({ lead: entry, notes: entry.notes || [] });
  }

  // Return all leads' CRM data
  return Response.json({ leads: crm });
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

  await saveCRM(crm);
  return Response.json({ ok: true, lead: entry, notes: entry.notes || [] });
}
