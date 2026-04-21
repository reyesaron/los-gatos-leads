'use client';
import { useState, useEffect } from "react";
import DatePicker from "@/components/DatePicker";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const INTERACTION_TYPES = ["Call", "Meeting", "Lunch", "Email", "Text", "Referral", "Note"];
const TEAM = ["Daniel", "Aron", "Joseph"];
const RELATIONSHIP_STATUSES = ["New", "Reached Out", "Connected", "Active Referrer", "Inactive"];
const REL_COLORS = { New: MUTED, "Reached Out": "#60a5fa", Connected: "#4ade80", "Active Referrer": RED, Inactive: DIM };

export default function MobileContactActions({ contact, apiPath, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("info");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Call");
  const [noteAuthor, setNoteAuthor] = useState(currentUser?.name || TEAM[0]);
  const [saving, setSaving] = useState(false);

  const doAction = async (action, body) => {
    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: contact.id, ...body }),
      });
      const data = await res.json();
      if (data.contacts || data.architects) onUpdate(data.contacts || data.architects);
    } catch {}
    setSaving(false);
  };

  const phone = contact.phone || "";
  const email = contact.email || "";
  const url = contact.url || "";
  const interactions = contact.interactions || [];
  const typeColors = { Call: "#60a5fa", Meeting: "#4ade80", Lunch: "#fbbf24", Email: "#a78bfa", Text: "#94a3b8", Referral: RED, Note: MUTED };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: CARD, width: "100%", maxWidth: 500, borderRadius: "16px 16px 0 0", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: DIM }} />
        </div>

        {/* Contact header */}
        <div style={{ padding: "8px 20px 12px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{contact.name}</div>
          {contact.firm && <div style={{ fontSize: 14, color: MUTED }}>{contact.firm}</div>}
          {contact.specialty && <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{contact.specialty}</div>}

          {/* Quick contact buttons */}
          {(phone || email) && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", borderRadius: 8, background: "#052e16", color: "#4ade80", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                  📞 Call
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", borderRadius: 8, background: "#172554", color: "#60a5fa", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                  ✉ Email
                </a>
              )}
              {url && (
                <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", borderRadius: 8, background: "#1c1c1c", color: MUTED, fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                  🌐 Web
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, padding: "0 20px 12px" }}>
          {[
            { id: "info", label: "Info" },
            { id: "log", label: "Log" },
            { id: "touch", label: "Next Touch" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${tab === t.id ? RED : BORDER}`, background: tab === t.id ? RED_DARK : BG, color: tab === t.id ? RED : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 20px 24px" }}>
          {/* INFO TAB */}
          {tab === "info" && (
            <div>
              {/* Relationship status */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Relationship</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                {RELATIONSHIP_STATUSES.map(s => (
                  <button key={s} onClick={() => {
                    if (s === "Inactive") {
                      if (confirm(`Move ${contact.name} to inactive?`)) doAction("setRelationship", { relationshipStatus: s });
                    } else {
                      doAction("setRelationship", { relationshipStatus: s });
                    }
                  }} disabled={saving} style={{ padding: "12px 10px", borderRadius: 8, border: `1px solid ${contact.relationshipStatus === s ? (REL_COLORS[s] || BORDER) : BORDER}`, background: contact.relationshipStatus === s ? `${REL_COLORS[s]}22` : BG, color: contact.relationshipStatus === s ? (REL_COLORS[s] || TEXT) : TEXT, fontSize: 13, fontWeight: contact.relationshipStatus === s ? 700 : 400, cursor: "pointer" }}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Contact details */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {phone && <div style={{ fontSize: 13, color: TEXT }}>📞 <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ color: TEXT, textDecoration: "none" }}>{phone}</a></div>}
                {email && <div style={{ fontSize: 13, color: TEXT }}>✉ <a href={`mailto:${email}`} style={{ color: "#60a5fa", textDecoration: "none" }}>{email}</a></div>}
                {url && <div style={{ fontSize: 13 }}>🌐 <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>{url.replace(/^https?:\/\//, "")}</a></div>}
                {contact.socials && <div style={{ fontSize: 13 }}>📱 <a href={contact.socials.startsWith("http") ? contact.socials : `https://${contact.socials}`} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>{contact.socials}</a></div>}
                {contact.notes && <div style={{ fontSize: 12, color: DIM, fontStyle: "italic", marginTop: 4 }}>{contact.notes}</div>}
              </div>

              {/* Cities */}
              {(contact.cities || []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                  {contact.cities.map(c => <span key={c} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: BG, color: DIM, border: `1px solid ${BORDER}` }}>{c}</span>)}
                </div>
              )}
            </div>
          )}

          {/* LOG TAB */}
          {tab === "log" && (
            <div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Log Interaction</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <select value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 14, flex: 1 }}>
                  {TEAM.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 14, flex: 1 }}>
                  {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="What happened..." rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 15, outline: "none", resize: "vertical", fontFamily: "inherit", minHeight: 80 }} autoFocus />
              <button onClick={() => { if (noteText.trim()) { doAction("addInteraction", { type: noteType, note: noteText.trim(), author: noteAuthor }); setNoteText(""); } }} disabled={!noteText.trim() || saving} style={{ marginTop: 8, width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4 }}>
                {saving ? "Saving..." : "Log"}
              </button>

              {/* Recent interactions */}
              {interactions.length > 0 && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>Recent</div>
                  {interactions.slice(0, 5).map((n, i) => (
                    <div key={i} style={{ marginBottom: 6, fontSize: 12, lineHeight: 1.4, display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${typeColors[n.type] || MUTED}22`, color: typeColors[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 1 }}>{n.type}</span>
                      <div>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                        <span style={{ color: DIM, marginLeft: 6, fontSize: 10 }}>{new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <div style={{ color: MUTED, marginTop: 1 }}>{n.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NEXT TOUCH TAB */}
          {tab === "touch" && (
            <div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Set Next Touch Date</div>
              <DatePicker value={contact.nextTouchDate || ""} onChange={date => doAction("setNextTouch", { nextTouchDate: date })} placeholder="Set touch date" />
              {contact.nextTouchDate && (
                <div style={{ marginTop: 8, fontSize: 14, color: TEXT }}>
                  Current: {new Date(contact.nextTouchDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
              {contact.lastInteraction && (
                <div style={{ marginTop: 12, fontSize: 12, color: DIM }}>
                  Last contact: {new Date(contact.lastInteraction).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by {contact.lastInteractionBy || "—"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        <div style={{ padding: "0 20px 20px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
