import { put, list } from "@vercel/blob";

export function createContactsAPI(blobName) {
  async function loadContacts() {
    try {
      const { blobs } = await list({ prefix: blobName });
      if (blobs.length === 0) return [];
      const url = blobs[0].url + (blobs[0].url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      return await res.json();
    } catch {
      return [];
    }
  }

  async function saveContacts(data) {
    await put(blobName, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  }

  async function GET() {
    const contacts = await loadContacts();
    return Response.json({ contacts }, { headers: { "Cache-Control": "no-store" } });
  }

  async function POST(request) {
    const body = await request.json();
    const { action } = body;
    const contacts = await loadContacts();

    if (action === "add") {
      const { name, firm, phone, email, cities, specialty, notes } = body;
      if (!name) return Response.json({ error: "name required" }, { status: 400 });
      contacts.push({
        id: Date.now().toString(36),
        name, firm: firm || "", phone: phone || "", email: email || "",
        cities: cities || [], specialty: specialty || "", notes: notes || "",
        addedAt: new Date().toISOString(),
      });
      await saveContacts(contacts);
      return Response.json({ ok: true, contacts });
    }

    if (action === "update") {
      const { id, ...fields } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      Object.assign(contacts[idx], fields, { updatedAt: new Date().toISOString() });
      delete contacts[idx].action;
      await saveContacts(contacts);
      return Response.json({ ok: true, contacts });
    }

    if (action === "delete") {
      const { id } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      contacts.splice(idx, 1);
      await saveContacts(contacts);
      return Response.json({ ok: true, contacts });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  return { GET, POST };
}
