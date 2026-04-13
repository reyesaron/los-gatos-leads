import { kv } from "@vercel/kv";

// GET /api/leads — fetch CRM data for all leads (or a specific one)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("id");

  if (leadId) {
    const data = await kv.hgetall(`lead:${leadId}`);
    const notes = await kv.lrange(`notes:${leadId}`, 0, -1);
    return Response.json({ lead: data || {}, notes: notes || [] });
  }

  // Get all lead CRM data
  const keys = await kv.keys("lead:*");
  const leads = {};
  for (const key of keys) {
    const id = key.replace("lead:", "");
    leads[id] = await kv.hgetall(key);
  }
  return Response.json({ leads });
}

// POST /api/leads — update lead status, add notes
export async function POST(request) {
  const body = await request.json();
  const { leadId, action } = body;

  if (!leadId) {
    return Response.json({ error: "leadId required" }, { status: 400 });
  }

  const key = `lead:${leadId}`;

  if (action === "updateStatus") {
    const { status, assignee } = body;
    const updates = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (assignee) updates.assignee = assignee;
    await kv.hset(key, updates);
    const lead = await kv.hgetall(key);
    return Response.json({ ok: true, lead });
  }

  if (action === "addNote") {
    const { note, author } = body;
    if (!note || !author) {
      return Response.json({ error: "note and author required" }, { status: 400 });
    }
    const entry = JSON.stringify({
      text: note,
      author,
      timestamp: new Date().toISOString(),
    });
    await kv.lpush(`notes:${leadId}`, entry);
    // Also update the lead's last activity
    await kv.hset(key, {
      lastContactBy: author,
      lastContactAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const notes = await kv.lrange(`notes:${leadId}`, 0, -1);
    const lead = await kv.hgetall(key);
    return Response.json({ ok: true, lead, notes });
  }

  if (action === "setFollowUp") {
    const { followUpDate, assignee } = body;
    await kv.hset(key, {
      followUpDate: followUpDate || "",
      followUpAssignee: assignee || "",
      updatedAt: new Date().toISOString(),
    });
    const lead = await kv.hgetall(key);
    return Response.json({ ok: true, lead });
  }

  if (action === "setEstValue") {
    const { estValue } = body;
    await kv.hset(key, {
      estValue: estValue || 0,
      updatedAt: new Date().toISOString(),
    });
    const lead = await kv.hgetall(key);
    return Response.json({ ok: true, lead });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
