import { createContactsAPI } from "@/lib/contacts-api";

const api = createContactsAPI("architects.json");

// Wrap to return "architects" key for backward compat with existing ArchitectsView
export async function GET(request) {
  const resp = await api.GET(request);
  const data = await resp.json();
  return Response.json({ architects: data.contacts || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const resp = await api.POST(request);
  const data = await resp.json();
  if (data.contacts) return Response.json({ ...data, architects: data.contacts });
  return Response.json(data);
}
