import { put, list } from "@vercel/blob";

const BLOB_NAME = "architects.json";

async function loadArchitects() {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

async function saveArchitects(data) {
  await put(BLOB_NAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
  });
}

export async function GET() {
  const architects = await loadArchitects();
  return Response.json({ architects });
}

export async function POST(request) {
  const body = await request.json();
  const { action } = body;
  const architects = await loadArchitects();

  if (action === "add") {
    const { name, firm, phone, email, cities, specialty, notes } = body;
    if (!name) return Response.json({ error: "name required" }, { status: 400 });
    architects.push({
      id: Date.now().toString(36),
      name,
      firm: firm || "",
      phone: phone || "",
      email: email || "",
      cities: cities || [],
      specialty: specialty || "",
      notes: notes || "",
      addedAt: new Date().toISOString(),
    });
    await saveArchitects(architects);
    return Response.json({ ok: true, architects });
  }

  if (action === "update") {
    const { id, ...fields } = body;
    const idx = architects.findIndex(a => a.id === id);
    if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
    Object.assign(architects[idx], fields, { updatedAt: new Date().toISOString() });
    delete architects[idx].action;
    await saveArchitects(architects);
    return Response.json({ ok: true, architects });
  }

  if (action === "delete") {
    const { id } = body;
    const idx = architects.findIndex(a => a.id === id);
    if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
    architects.splice(idx, 1);
    await saveArchitects(architects);
    return Response.json({ ok: true, architects });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
