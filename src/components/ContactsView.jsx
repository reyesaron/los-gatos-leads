'use client';
import { useState, useEffect, useMemo } from "react";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const CITIES = ["Los Gatos", "Saratoga", "San Jose", "Sunnyvale", "Cupertino", "Mountain View", "Woodside", "Atherton", "Los Altos", "Los Altos Hills", "Palo Alto", "Milpitas", "Morgan Hill", "Campbell"];
const iS = { padding: "6px 10px", borderRadius: 5, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 12, outline: "none", width: "100%" };

const ROLE_CONFIG = {
  Architect: { title: "Architect & Designer Database", singular: "Architect", specialtyPlaceholder: "Custom homes, ADUs, historic...", firmLabel: "Firm" },
  Designer: { title: "Interior Designer Database", singular: "Designer", specialtyPlaceholder: "Kitchens, bathrooms, whole-home...", firmLabel: "Studio / Firm" },
  Realtor: { title: "Realtor Database", singular: "Realtor", specialtyPlaceholder: "Luxury, new construction, teardowns...", firmLabel: "Brokerage" },
};

export default function ContactsView({ role, apiPath, crmData, scored }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.Architect;
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", firm: "", phone: "", email: "", url: "", socials: "", cities: [], specialty: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${apiPath}?_t=${Date.now()}`).then(r => r.json()).then(d => setContacts(d.architects || d.contacts || [])).catch(() => {}).finally(() => setLoading(false));
  }, [apiPath]);

  // Auto-detect from CRM contact data
  const crmContacts = useMemo(() => {
    const map = {};
    for (const p of scored) {
      const crm = crmData[p._leadId];
      if (crm?.contactRole === role && crm.contactName) {
        const name = crm.contactName.trim();
        if (!map[name]) map[name] = { name, projects: [], cities: new Set(), phone: crm.contactPhone || "", email: crm.contactEmail || "" };
        map[name].projects.push(p.address);
        map[name].cities.add(p.city || "Los Gatos");
      }
    }
    return Object.values(map).map(a => ({ ...a, cities: [...a.cities], projectCount: a.projects.length, source: "crm" }));
  }, [scored, crmData, role]);

  // Merge manual + CRM contacts, dedup by name
  const allContacts = useMemo(() => {
    const merged = [...contacts.map(a => ({ ...a, projectCount: 0, projects: [], source: "manual" }))];
    for (const ca of crmContacts) {
      const existing = merged.find(m => m.name.toLowerCase() === ca.name.toLowerCase());
      if (existing) {
        existing.projectCount = ca.projectCount;
        existing.projects = ca.projects;
        if (!existing.phone && ca.phone) existing.phone = ca.phone;
        if (!existing.email && ca.email) existing.email = ca.email;
        if (ca.cities.length) existing.cities = [...new Set([...(existing.cities || []), ...ca.cities])];
        existing.source = "both";
      } else {
        merged.push(ca);
      }
    }
    merged.sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));
    return merged;
  }, [contacts, crmContacts]);

  const filtered = useMemo(() => {
    if (!search) return allContacts;
    const q = search.toLowerCase();
    return allContacts.filter(a => a.name.toLowerCase().includes(q) || (a.firm || "").toLowerCase().includes(q) || (a.specialty || "").toLowerCase().includes(q) || (a.cities || []).some(c => c.toLowerCase().includes(q)));
  }, [allContacts, search]);

  const resetForm = () => { setForm({ name: "", firm: "", phone: "", email: "", url: "", socials: "", cities: [], specialty: "", notes: "" }); setEditId(null); setShowForm(false); };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const action = editId ? "update" : "add";
    const body = { action, ...form, ...(editId ? { id: editId } : {}) };
    try {
      const res = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.architects || data.contacts) setContacts(data.architects || data.contacts);
      resetForm();
    } catch {}
    setSaving(false);
  };

  const deleteContact = async (id) => {
    try {
      const res = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
      const data = await res.json();
      if (data.architects || data.contacts) setContacts(data.architects || data.contacts);
    } catch {}
  };

  const startEdit = (a) => {
    setForm({ name: a.name, firm: a.firm || "", phone: a.phone || "", email: a.email || "", url: a.url || "", socials: a.socials || "", cities: a.cities || [], specialty: a.specialty || "", notes: a.notes || "" });
    setEditId(a.id);
    setShowForm(true);
  };

  const toggleCity = (city) => {
    setForm(f => ({ ...f, cities: f.cities.includes(city) ? f.cities.filter(c => c !== city) : [...f.cities, city] }));
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: MUTED }}>Loading {config.singular.toLowerCase()}s...</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, flex: 1 }}>
          {config.title}
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 8 }}>{allContacts.length} contacts</span>
        </div>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...iS, width: 180, padding: "6px 10px" }} />
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ padding: "6px 14px", borderRadius: 5, border: "none", background: RED, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: CARD, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Name *</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>{config.firmLabel}</div>
              <input value={form.firm} onChange={e => setForm(f => ({ ...f, firm: e.target.value }))} placeholder={`${config.firmLabel} name`} style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Phone</div>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(408) 555-1234" style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Email</div>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Website</div>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Socials</div>
              <input value={form.socials} onChange={e => setForm(f => ({ ...f, socials: e.target.value }))} placeholder="Instagram, LinkedIn, etc." style={iS} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Specialty</div>
              <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder={config.specialtyPlaceholder} style={iS} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 3, fontWeight: 600 }}>Notes</div>
              <textarea value={form.notes} onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }} placeholder="Met at..." rows={2} style={{ ...iS, resize: "vertical", fontFamily: "inherit", minHeight: 40, overflow: "hidden" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4, fontWeight: 600 }}>Active Cities</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {CITIES.map(c => (
                  <button key={c} onClick={() => toggleCity(c)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${form.cities.includes(c) ? RED : BORDER}`, background: form.cities.includes(c) ? RED_DARK : BG, color: form.cities.includes(c) ? RED : DIM, fontSize: 11, cursor: "pointer", fontWeight: 500 }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={submit} disabled={!form.name.trim() || saving} style={{ padding: "7px 18px", borderRadius: 5, border: "none", background: form.name.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 12, fontWeight: 600, cursor: form.name.trim() ? "pointer" : "default", opacity: form.name.trim() ? 1 : 0.4 }}>
              {saving ? "Saving..." : editId ? "Update" : `Add ${config.singular}`}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: MUTED }}>No {config.singular.toLowerCase()}s yet. Add one or set contact role to "{role}" on a lead.</div>}
      {filtered.map((a, i) => (
        <div key={a.id || i} style={{ background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, padding: "10px 14px", marginBottom: 4, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: a.projectCount > 0 ? RED_DARK : "#1c1c1c", color: a.projectCount > 0 ? RED : DIM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
            {a.projectCount}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{a.name}</span>
              {a.firm && <span style={{ fontSize: 11, color: MUTED }}>{a.firm}</span>}
              {a.source === "crm" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#172554", color: "#60a5fa" }}>FROM LEADS</span>}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: MUTED, marginBottom: 2 }}>
              {a.phone && <span>{a.phone}</span>}
              {a.email && <span>{a.email}</span>}
              {a.url && <a href={a.url.startsWith("http") ? a.url : `https://${a.url}`} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>{a.url.replace(/^https?:\/\//, "")}</a>}
              {a.specialty && <span>{a.specialty}</span>}
            </div>
            {a.socials && <div style={{ fontSize: 11, color: DIM, marginBottom: 2 }}>{a.socials}</div>}
            {(a.cities || []).length > 0 && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 2 }}>
                {a.cities.map(c => <span key={c} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: BG, color: DIM, border: `1px solid ${BORDER}` }}>{c}</span>)}
              </div>
            )}
            {a.projects && a.projects.length > 0 && (
              <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>Projects: {a.projects.join(", ")}</div>
            )}
            {a.notes && <div style={{ fontSize: 11, color: DIM, fontStyle: "italic", marginTop: 2 }}>{a.notes}</div>}
          </div>
          {a.source !== "crm" && a.id && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => startEdit(a)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: MUTED, fontSize: 10, cursor: "pointer" }}>Edit</button>
              <button onClick={() => deleteContact(a.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 10, cursor: "pointer" }}>Del</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
