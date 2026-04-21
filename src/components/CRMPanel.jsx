'use client';
import { useState, useEffect, useCallback } from "react";
import DatePicker from "@/components/DatePicker";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const TEAM = ["Daniel", "Aron", "Joseph"];
const STATUSES = ["New", "Contacted", "Meeting Set", "Proposal Sent", "Won", "Lost", "Archived"];
const STATUS_COLORS = {
  New: { bg: "#1c1c1c", fg: MUTED },
  Contacted: { bg: "#172554", fg: "#60a5fa" },
  "Meeting Set": { bg: "#422006", fg: "#fbbf24" },
  "Proposal Sent": { bg: "#3b0764", fg: "#a78bfa" },
  Won: { bg: "#052e16", fg: "#4ade80" },
  Lost: { bg: "#1c1c1c", fg: "#525252" },
  Archived: { bg: "#1c1c1c", fg: "#404040" },
};

const iS = { padding: "6px 10px", borderRadius: 5, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 12, outline: "none" };

export default function CRMPanel({ leadId, onUpdate, leadAddress, leadScope }) {
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(TEAM[0]);
  const [saving, setSaving] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch once on mount — never overwrite from parent
  useEffect(() => {
    if (hasFetched) return;
    fetch(`/api/leads?id=${encodeURIComponent(leadId)}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { setLead(data.lead || {}); setNotes(data.notes || data.lead?.notes || []); })
      .catch(() => {})
      .finally(() => { setLoading(false); setHasFetched(true); });
  }, [leadId, hasFetched]);

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "updateStatus", status }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  const updateAssignee = async (assignee) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "updateStatus", assignee }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "addNote", note: noteText.trim(), author: noteAuthor }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
      if (data.notes) setNotes(data.notes);
      setNoteText("");
    } catch {}
    setSaving(false);
  };

  const setFollowUp = async (date) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "setFollowUp", followUpDate: date, assignee: lead?.assignee || "", leadAddress: leadAddress || "", leadScope: leadScope || "" }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  const setEstValue = async (value) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "setEstValue", estValue: parseInt(value) || 0 }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  const saveSource = async (source, sourceNote) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "setSource", source, sourceNote }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  const saveContact = async (field, value) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "setContact", [field]: value }),
      });
      const data = await res.json();
      if (data.lead) { setLead(data.lead); onUpdate?.(leadId, data.lead); }
    } catch {}
    setSaving(false);
  };

  if (loading) return <div style={{ padding: "10px 0", fontSize: 12, color: MUTED }}>Loading CRM data...</div>;

  const currentStatus = lead?.status || "New";
  const sc = STATUS_COLORS[currentStatus] || STATUS_COLORS.New;

  return (
    <div style={{ background: BG, borderRadius: 6, padding: "12px", border: `1px solid ${BORDER}`, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        Lead Tracker
        {saving && <span style={{ marginLeft: 8, color: DIM, fontWeight: 400, textTransform: "none" }}>Saving...</span>}
      </div>

      {/* Status + Assignee + Follow-up + Est Value + Source row */}
      <div className="apex-crm-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Status:</span>
          <select value={currentStatus} onChange={e => updateStatus(e.target.value)} style={{ ...iS, background: sc.bg, color: sc.fg, fontWeight: 600 }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Assigned:</span>
          <select value={lead?.assignee || ""} onChange={e => updateAssignee(e.target.value)} style={iS}>
            <option value="">Unassigned</option>
            {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Follow-up:</span>
          <DatePicker value={lead?.followUpDate || ""} onChange={setFollowUp} placeholder="Set follow-up" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Est. value:</span>
          <input type="text" placeholder="$0" value={lead?.estValue ? `$${Number(lead.estValue).toLocaleString()}` : ""} onBlur={e => setEstValue(e.target.value.replace(/[$,]/g, ""))} onChange={() => {}} onFocus={e => { e.target.value = lead?.estValue || ""; }} style={{ ...iS, width: 90, fontFamily: "'JetBrains Mono',monospace" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Source:</span>
          <select value={lead?.leadSource || ""} onChange={e => saveSource(e.target.value, lead?.sourceNote || "")} style={iS}>
            <option value="">—</option>
            <option value="Scraper">Scraper</option>
            <option value="Referral">Referral</option>
            <option value="Architect">Architect</option>
            <option value="Drive-by">Drive-by</option>
            <option value="Realtor">Realtor</option>
            <option value="Website">Website</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Contact info */}
      <div style={{ marginBottom: 8 }}>
        <div onClick={() => setShowContact(!showContact)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: MUTED, marginBottom: showContact ? 6 : 0 }}>
          <span style={{ transform: showContact ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
          <span style={{ fontWeight: 600 }}>Contact Info</span>
          {lead?.contactName && <span style={{ color: DIM, fontWeight: 400 }}>— {lead.contactName}{lead.contactRole ? ` (${lead.contactRole})` : ""}</span>}
        </div>
        {showContact && (
          <div className="apex-contact-fields" style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: MUTED }}>Name:</span>
              <input type="text" defaultValue={lead?.contactName || ""} onBlur={e => saveContact("contactName", e.target.value)} placeholder="Owner / Architect" style={{ ...iS, width: 140 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: MUTED }}>Role:</span>
              <select defaultValue={lead?.contactRole || ""} onChange={e => saveContact("contactRole", e.target.value)} style={iS}>
                <option value="">—</option>
                <option value="Owner">Owner</option>
                <option value="Architect">Architect</option>
                <option value="Designer">Designer</option>
                <option value="Agent">Agent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: MUTED }}>Phone:</span>
              <input type="tel" defaultValue={lead?.contactPhone || ""} onBlur={e => saveContact("contactPhone", e.target.value)} placeholder="(408) 555-1234" style={{ ...iS, width: 130 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: MUTED }}>Email:</span>
              <input type="email" defaultValue={lead?.contactEmail || ""} onBlur={e => saveContact("contactEmail", e.target.value)} placeholder="name@email.com" style={{ ...iS, width: 180 }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick contact buttons */}
      {(lead?.contactPhone || lead?.contactEmail) && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {lead.contactPhone && (
            <a href={`tel:${lead.contactPhone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, background: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
              📞 {lead.contactName?.split(" ")[0] || "Call"}
            </a>
          )}
          {lead.contactEmail && (
            <a href={`mailto:${lead.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, background: "#172554", color: "#60a5fa", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
              ✉ Email
            </a>
          )}
        </div>
      )}

      {/* Last contact info */}
      {lead?.lastContactBy && (
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
          Last contact: <strong style={{ color: TEXT }}>{lead.lastContactBy}</strong> on {new Date(lead.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </div>
      )}

      {/* Add note */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
        <select value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} style={{ ...iS, width: 90, flexShrink: 0 }}>
          {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note about this lead..." rows={2} style={{ ...iS, flex: 1, resize: "vertical", fontFamily: "inherit", minHeight: 36 }} onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); }} />
        <button onClick={addNote} disabled={!noteText.trim() || saving} style={{ ...iS, background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", cursor: noteText.trim() ? "pointer" : "default", fontWeight: 600, flexShrink: 0, opacity: noteText.trim() ? 1 : 0.4, border: "none", padding: "6px 14px" }}>
          Log
        </button>
      </div>

      {/* Notes history */}
      {notes.length > 0 && (
        <div style={{ maxHeight: 200, overflowY: "auto", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
          {notes.map((n, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.4 }}>
              <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
              <span style={{ color: DIM, marginLeft: 6, fontSize: 10 }}>
                {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
              <div style={{ color: MUTED, marginTop: 2 }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
