'use client';
import { useState, useRef, useCallback } from "react";
import DatePicker from "@/components/DatePicker";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const INTERACTION_TYPES = ["Call", "Meeting", "Coffee", "Lunch/Dinner", "Email", "Text", "Referral", "Note"];
const TYPE_COLORS = { Call: "#60a5fa", Meeting: "#4ade80", Coffee: "#fbbf24", "Lunch/Dinner": "#fb923c", Email: "#a78bfa", Text: "#94a3b8", Referral: RED, Note: MUTED };
const TEAM = ["Daniel", "Aron", "Joseph"];
const RELATIONSHIP_STATUSES = ["New", "Reached Out", "Connected", "Active Referrer", "Inactive"];
const REL_COLORS = { New: MUTED, "Reached Out": "#60a5fa", Connected: "#4ade80", "Active Referrer": RED, Inactive: DIM };

const QUICK_NOTES = [
  { text: "Called, no answer", type: "Call" },
  { text: "Left voicemail", type: "Call" },
  { text: "Met at office", type: "Meeting" },
  { text: "Coffee", type: "Coffee" },
  { text: "Lunch/Dinner", type: "Lunch/Dinner" },
  { text: "Received referral", type: "Referral" },
];

const iS = { padding: "12px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 15, outline: "none", width: "100%" };

const SNAP_HALF = 55;
const SNAP_FULL = 95;

export default function MobileContactActions({ contact, apiPath, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("info");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Call");
  const [noteAuthor, setNoteAuthor] = useState(currentUser?.name || TEAM[0]);
  const [saving, setSaving] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(SNAP_HALF);
  const [flashField, setFlashField] = useState(null);

  const dragRef = useRef({ active: false, startY: 0, startHeight: 0 });

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

  const logQuickNote = (text, type) => {
    doAction("addInteraction", { type: type || "Note", note: text, author: noteAuthor });
    setFlashField(text);
    setTimeout(() => setFlashField(null), 800);
  };

  // --- Drag-to-expand handlers ---
  const onTouchStart = useCallback((e) => {
    dragRef.current = { active: true, startY: e.touches[0].clientY, startHeight: sheetHeight };
  }, [sheetHeight]);

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dy = dragRef.current.startY - e.touches[0].clientY;
    const dvh = (dy / window.innerHeight) * 100;
    const newHeight = Math.min(SNAP_FULL, Math.max(30, dragRef.current.startHeight + dvh));
    setSheetHeight(newHeight);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (sheetHeight < 35) {
      onClose();
    } else if (sheetHeight < (SNAP_HALF + SNAP_FULL) / 2) {
      setSheetHeight(SNAP_HALF);
    } else {
      setSheetHeight(SNAP_FULL);
    }
  }, [sheetHeight, onClose]);

  const phone = contact.phone || "";
  const email = contact.email || "";
  const url = contact.url || "";
  const interactions = contact.interactions || [];
  const isExpanded = sheetHeight > (SNAP_HALF + SNAP_FULL) / 2;

  // Directions — use firm name + city as search if available
  const firmSearch = contact.firm ? `${contact.firm}, ${(contact.cities || [])[0] || "San Jose"}, CA` : "";
  const mapsUrl = firmSearch ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(firmSearch)}` : "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        style={{
          background: CARD, width: "100%", maxWidth: 500,
          borderRadius: "16px 16px 0 0",
          height: `${sheetHeight}vh`,
          transition: dragRef.current.active ? "none" : "height 0.3s ease-out",
          display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", cursor: "grab", touchAction: "none" }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: DIM }} />
        </div>

        {/* Contact header */}
        <div style={{ padding: "4px 20px 12px", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{contact.name}</div>
          {contact.firm && <div style={{ fontSize: 14, color: MUTED }}>{contact.firm}</div>}
          {contact.specialty && <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{contact.specialty}</div>}

          {/* Relationship badge */}
          {contact.relationshipStatus && contact.relationshipStatus !== "New" && (
            <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: `${REL_COLORS[contact.relationshipStatus] || MUTED}22`, color: REL_COLORS[contact.relationshipStatus] || MUTED }}>
              {contact.relationshipStatus.toUpperCase()}
            </span>
          )}

          {/* Quick action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#052e16", color: "#4ade80", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                📞 Call
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#172554", color: "#60a5fa", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                ✉ Email
              </a>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#1c1c1c", color: TEXT, fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                📍 Directions
              </a>
            )}
          </div>

          {/* Last contact */}
          {contact.lastInteraction && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
              Last contact: <strong style={{ color: TEXT }}>{contact.lastInteractionBy || "—"}</strong> on {new Date(contact.lastInteraction).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, padding: "0 20px 10px", flexShrink: 0 }}>
          {[
            { id: "info", label: "Info" },
            { id: "log", label: `Log${interactions.length ? ` (${interactions.length})` : ""}` },
            { id: "touch", label: "Next Touch" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${tab === t.id ? RED : BORDER}`, background: tab === t.id ? RED_DARK : BG, color: tab === t.id ? RED : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div style={{ padding: "0 20px", flex: 1, overflowY: "auto", paddingBottom: 20 }}>

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

              {/* Referrals */}
              {(() => {
                const referrals = interactions.filter(n => n.type === "Referral");
                if (referrals.length === 0) return null;
                return (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginBottom: 4 }}>{referrals.length} referral{referrals.length !== 1 ? "s" : ""}</div>
                    {referrals.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{r.note}</div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* LOG TAB — quick-log + typed freeform + history */}
          {tab === "log" && (
            <div>
              {/* Quick-log buttons */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Quick Log</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
                {QUICK_NOTES.map(q => (
                  <button
                    key={q.text}
                    onClick={() => logQuickNote(q.text, q.type)}
                    disabled={saving}
                    style={{
                      padding: "12px 10px", borderRadius: 8,
                      border: `1px solid ${flashField === q.text ? "#4ade80" : BORDER}`,
                      background: flashField === q.text ? "#052e16" : BG,
                      color: flashField === q.text ? "#4ade80" : TEXT,
                      fontSize: 13, fontWeight: 400, cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    {flashField === q.text ? "✓ Logged" : q.text}
                  </button>
                ))}
              </div>

              {/* Freeform interaction */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Log Interaction</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <select value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} style={{ ...iS, flex: 1 }}>
                  {TEAM.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...iS, flex: 1, color: TYPE_COLORS[noteType] || MUTED, fontWeight: 600 }}>
                  {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="What happened..." rows={3} style={{ ...iS, resize: "vertical", fontFamily: "inherit", minHeight: 80 }} />
              <button onClick={() => { if (noteText.trim()) { doAction("addInteraction", { type: noteType, note: noteText.trim(), author: noteAuthor }); setNoteText(""); } }} disabled={!noteText.trim() || saving} style={{ marginTop: 8, width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4 }}>
                {saving ? "Saving..." : "Log"}
              </button>

              {/* Interaction history with type badges */}
              {interactions.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 8 }}>History ({interactions.length})</div>
                  {interactions.slice(0, isExpanded ? undefined : 5).map((n, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${TYPE_COLORS[n.type] || MUTED}22`, color: TYPE_COLORS[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 1 }}>{n.type}</span>
                      <div>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                        <span style={{ color: DIM, marginLeft: 6, fontSize: 11 }}>
                          {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <div style={{ color: MUTED, marginTop: 2 }}>{n.note}</div>
                      </div>
                    </div>
                  ))}
                  {!isExpanded && interactions.length > 5 && (
                    <button onClick={() => setSheetHeight(SNAP_FULL)} style={{ background: "none", border: "none", color: RED, fontSize: 12, cursor: "pointer", padding: 0 }}>
                      Show all {interactions.length} interactions ↑
                    </button>
                  )}
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
                <div style={{ marginTop: 10, fontSize: 14, color: TEXT }}>
                  Current: {new Date(contact.nextTouchDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
              {contact.lastInteraction && (
                <div style={{ marginTop: 12, fontSize: 12, color: DIM }}>
                  Last contact: {contact.lastInteractionBy || "—"} on {new Date(contact.lastInteraction).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close button — fixed at bottom */}
        <div style={{ padding: "10px 20px 20px", flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
          <button onClick={onClose} style={{ width: "100%", padding: "14px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 14, cursor: "pointer" }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
