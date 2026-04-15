import { put, list } from "@vercel/blob";
import { auditFromRequest } from "@/lib/audit-helper";

export function createContactsAPI(blobName) {
  const contactType = blobName.replace(".json", "");
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
      await auditFromRequest(request, { action: `${contactType}_add`, targetType: contactType, targetId: name, details: `Added ${contactType}: ${name}` });
      return Response.json({ ok: true, contacts });
    }

    if (action === "update") {
      const { id, ...fields } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      const oldName = contacts[idx].name;
      Object.assign(contacts[idx], fields, { updatedAt: new Date().toISOString() });
      delete contacts[idx].action;
      await saveContacts(contacts);
      await auditFromRequest(request, { action: `${contactType}_update`, targetType: contactType, targetId: oldName, details: `Updated ${contactType}: ${oldName}` });
      return Response.json({ ok: true, contacts });
    }

    if (action === "setNextTouch") {
      const { id, nextTouchDate } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      contacts[idx].nextTouchDate = nextTouchDate || "";
      contacts[idx].updatedAt = new Date().toISOString();
      await saveContacts(contacts);
      await auditFromRequest(request, { action: `${contactType}_setNextTouch`, targetType: contactType, targetId: contacts[idx].name, details: `Next touch: ${nextTouchDate || "cleared"}` });
      return Response.json({ ok: true, contacts });
    }

    if (action === "setRelationship") {
      const { id, relationshipStatus } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      contacts[idx].relationshipStatus = relationshipStatus || "";
      contacts[idx].updatedAt = new Date().toISOString();
      await saveContacts(contacts);
      await auditFromRequest(request, { action: `${contactType}_setRelationship`, targetType: contactType, targetId: contacts[idx].name, details: `Relationship → ${relationshipStatus}` });
      return Response.json({ ok: true, contacts });
    }

    if (action === "addInteraction") {
      const { id, type, note, author } = body;
      if (!id || !author) return Response.json({ error: "id and author required" }, { status: 400 });
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      if (!contacts[idx].interactions) contacts[idx].interactions = [];
      contacts[idx].interactions.unshift({
        type: type || "Note",
        note: note || "",
        author,
        timestamp: new Date().toISOString(),
      });
      contacts[idx].lastInteraction = new Date().toISOString();
      contacts[idx].lastInteractionBy = author;
      contacts[idx].updatedAt = new Date().toISOString();
      await saveContacts(contacts);
      await auditFromRequest(request, { action: `${contactType}_interaction`, targetType: contactType, targetId: contacts[idx].name, details: `${type} by ${author}: ${(note || "").slice(0, 60)}` });
      return Response.json({ ok: true, contacts });
    }

    if (action === "delete") {
      const { id } = body;
      const idx = contacts.findIndex(a => a.id === id);
      if (idx === -1) return Response.json({ error: "not found" }, { status: 404 });
      const deleted = contacts[idx];
      contacts.splice(idx, 1);
      await saveContacts(contacts);
      await auditFromRequest(request, { action: `${contactType}_delete`, targetType: contactType, targetId: deleted.name || id, details: `Deleted ${contactType}: ${deleted.name || id}` });
      return Response.json({ ok: true, contacts });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  return { GET, POST };
}
