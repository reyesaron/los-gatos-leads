import { put, list } from "@vercel/blob";

const BLOB_NAME = "manual-leads.json";

async function loadManualLeads() {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

async function saveManualLeads(data) {
  await put(BLOB_NAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
  });
}

// GET /api/leads/manual — fetch all manual leads
export async function GET() {
  const leads = await loadManualLeads();
  return Response.json({ leads });
}

// POST /api/leads/manual — add or delete a manual lead
export async function POST(request) {
  const body = await request.json();
  const { action } = body;
  const leads = await loadManualLeads();

  if (action === "add") {
    const { address, city, neighborhood, category, scope, description, zoning, apn, dateFiled, planner, appType, existingSF, proposedSF } = body;
    if (!address || !city) {
      return Response.json({ error: "address and city required" }, { status: 400 });
    }
    const lead = {
      address,
      city,
      neighborhood: neighborhood || "",
      appNumber: "",
      appType: appType || "Manual Entry",
      description: description || "",
      overview: description || `Manual lead at ${address}`,
      existingSF: existingSF != null ? Number(existingSF) : null,
      proposedSF: proposedSF != null ? Number(proposedSF) : null,
      sfNote: "",
      dateFiled: dateFiled || new Date().toISOString().split("T")[0],
      status: "Pending",
      planner: planner || "",
      category: category || "New Construction",
      scope: scope || "Custom Home",
      zoning: zoning || "",
      apn: apn || "",
      pageUrl: "",
      docs: [],
      manual: true,
      addedAt: new Date().toISOString(),
      addedBy: body.addedBy || "",
    };
    leads.push(lead);
    await saveManualLeads(leads);
    return Response.json({ ok: true, lead, total: leads.length });
  }

  if (action === "delete") {
    const { index } = body;
    if (index == null || index < 0 || index >= leads.length) {
      return Response.json({ error: "invalid index" }, { status: 400 });
    }
    leads.splice(index, 1);
    await saveManualLeads(leads);
    return Response.json({ ok: true, total: leads.length });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
