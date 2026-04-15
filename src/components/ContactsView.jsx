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

const INTERACTION_TYPES = ["Call", "Meeting", "Lunch", "Email", "Text", "Referral", "Note"];
const TEAM = ["Daniel", "Aron", "Joseph"];
const RELATIONSHIP_STATUSES = ["New", "Reached Out", "Connected", "Active Referrer", "Inactive"];
const REL_COLORS = { New: MUTED, "Reached Out": "#60a5fa", Connected: "#4ade80", "Active Referrer": "#dc2626", Inactive: "#404040" };

function InteractionLog({ contact, apiPath, onUpdate }) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Call");
  const [noteAuthor, setNoteAuthor] = useState(TEAM[0]);
  const [saving, setSaving] = useState(false);

  const addInteraction = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addInteraction", id: contact.id, type: noteType, note: noteText.trim(), author: noteAuthor }),
      });
      const data = await res.json();
      if (data.contacts || data.architects) onUpdate(data.contacts || data.architects);
      setNoteText("");
    } catch {}
    setSaving(false);
  };

  const interactions = contact.interactions || [];
  const typeColors = { Call: "#60a5fa", Meeting: "#4ade80", Lunch: "#fbbf24", Email: "#a78bfa", Text: "#94a3b8", Referral: "#dc2626", Note: "#737373" };

  return (
    <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "flex-start" }}>
        <select value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} style={{ ...iS, width: 80, flexShrink: 0, padding: "4px 6px", fontSize: 11 }}>
          {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...iS, width: 75, flexShrink: 0, padding: "4px 6px", fontSize: 11 }}>
          {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log interaction..." onKeyDown={e => { if (e.key === "Enter") addInteraction(); }} style={{ ...iS, flex: 1, padding: "4px 8px", fontSize: 11 }} />
        <button onClick={addInteraction} disabled={!noteText.trim() || saving} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 11, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4, flexShrink: 0 }}>Log</button>
      </div>
      {interactions.length > 0 && (
        <div style={{ maxHeight: 150, overflowY: "auto" }}>
          {interactions.map((n, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 11, lineHeight: 1.4, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: `${typeColors[n.type] || MUTED}22`, color: typeColors[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 1 }}>{n.type}</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                <span style={{ color: DIM, marginLeft: 6, fontSize: 10 }}>{new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                <div style={{ color: MUTED, marginTop: 1 }}>{n.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContactsView({ role, apiPath, crmData, scored }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.Architect;
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", firm: "", phone: "", email: "", url: "", socials: "", cities: [], specialty: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

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

  const updateNextTouch = async (id, date) => {
    try {
      const res = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setNextTouch", id, nextTouchDate: date }) });
      const data = await res.json();
      if (data.contacts || data.architects) setContacts(data.contacts || data.architects);
    } catch {}
  };

  const updateRelationship = async (id, status) => {
    try {
      const res = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setRelationship", id, relationshipStatus: status }) });
      const data = await res.json();
      if (data.contacts || data.architects) setContacts(data.contacts || data.architects);
    } catch {}
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
      {filtered.map((a, i) => {
        const isOpen = expandedId === (a.id || i);
        return (
        <div key={a.id || i} style={{ background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, marginBottom: 4, overflow: "hidden" }}>
          <div onClick={() => setExpandedId(isOpen ? null : (a.id || i))} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: a.projectCount > 0 ? RED_DARK : "#1c1c1c", color: a.projectCount > 0 ? RED : DIM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
              {a.projectCount}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{a.name}</span>
                {a.firm && <span style={{ fontSize: 11, color: MUTED }}>{a.firm}</span>}
                {a.relationshipStatus && a.relationshipStatus !== "New" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${REL_COLORS[a.relationshipStatus] || MUTED}22`, color: REL_COLORS[a.relationshipStatus] || MUTED, fontWeight: 600 }}>{a.relationshipStatus.toUpperCase()}</span>}
                {a.source === "crm" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#172554", color: "#60a5fa" }}>FROM LEADS</span>}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: MUTED, marginBottom: 2 }}>
                {a.phone && <span>{a.phone}</span>}
                {a.email && <span>{a.email}</span>}
                {a.url && <a href={a.url.startsWith("http") ? a.url : `https://${a.url}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#60a5fa", textDecoration: "none" }}>{a.url.replace(/^https?:\/\//, "")}</a>}
                {a.specialty && <span>{a.specialty}</span>}
              </div>
              {a.lastInteraction && <div style={{ fontSize: 10, color: DIM }}>Last contact: {new Date(a.lastInteraction).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by {a.lastInteractionBy || "—"}</div>}
              {a.nextTouchDate && new Date(a.nextTouchDate) < new Date(new Date().toDateString()) && <div className="badge-new" style={{ fontSize: 10, color: "#fb923c", fontWeight: 600 }}>Touch overdue — {a.nextTouchDate}</div>}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
              {a.source !== "crm" && a.id && <>
                <button onClick={e => { e.stopPropagation(); startEdit(a); }} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: MUTED, fontSize: 10, cursor: "pointer" }}>Edit</button>
                <button onClick={e => { e.stopPropagation(); deleteContact(a.id); }} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 10, cursor: "pointer" }}>Del</button>
              </>}
              <div style={{ fontSize: 14, color: DIM, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</div>
            </div>
          </div>
          {isOpen && (
            <div style={{ padding: "0 14px 10px", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
              {a.id && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>Relationship:</span>
                  <select value={a.relationshipStatus || "New"} onChange={e => updateRelationship(a.id, e.target.value)} style={{ ...iS, width: "auto", padding: "3px 8px", fontSize: 11, color: REL_COLORS[a.relationshipStatus || "New"], fontWeight: 600 }}>
                    {RELATIONSHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>Next touch:</span>
                  <input type="date" value={a.nextTouchDate || ""} onChange={e => updateNextTouch(a.id, e.target.value)} style={{ ...iS, width: 130, padding: "3px 8px", fontSize: 11 }} />
                </div>
              </div>}
              {a.socials && <div style={{ fontSize: 11, color: DIM, marginBottom: 4 }}>Socials: {a.socials}</div>}
              {(a.cities || []).length > 0 && (
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 4 }}>
                  {a.cities.map(c => <span key={c} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: BG, color: DIM, border: `1px solid ${BORDER}` }}>{c}</span>)}
                </div>
              )}
              {(() => {
                const referrals = (a.interactions || []).filter(n => n.type === "Referral");
                const projectList = a.projects || [];
                const allRefs = [...new Set([...projectList, ...referrals.map(r => r.note)])].filter(Boolean);
                if (allRefs.length === 0) return null;
                return <div style={{ fontSize: 11, color: DIM, marginBottom: 4 }}>
                  <span style={{ color: RED, fontWeight: 600 }}>{allRefs.length} referral{allRefs.length !== 1 ? "s" : ""}</span>: {allRefs.join(" · ")}
                </div>;
              })()}
              {a.notes && <div style={{ fontSize: 11, color: DIM, fontStyle: "italic", marginBottom: 4 }}>{a.notes}</div>}
              {a.id && <InteractionLog contact={a} apiPath={apiPath} onUpdate={setContacts} />}
            </div>
          )}
        </div>
      );})}
    </div>
  );
}
