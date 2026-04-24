'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import DatePicker from "@/components/DatePicker";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const TEAM = ["Daniel", "Aron", "Joseph"];
const STATUSES = ["New", "Contacted", "Meeting Set", "Proposal Sent", "Won", "Lost", "Archived"];
const INTERACTION_TYPES = ["Call", "Meeting", "Coffee", "Lunch/Dinner", "Email", "Text", "Note"];
const TYPE_COLORS = { Call: "#60a5fa", Meeting: "#4ade80", Coffee: "#fbbf24", "Lunch/Dinner": "#fb923c", Email: "#a78bfa", Text: "#94a3b8", Note: "#737373" };
const QUICK_NOTES = [
  { text: "Called, no answer", type: "Call" },
  { text: "Left voicemail", type: "Call" },
  { text: "Met on-site", type: "Meeting" },
  { text: "Sent proposal", type: "Email" },
  { text: "Coffee", type: "Coffee" },
  { text: "Lunch/Dinner", type: "Lunch/Dinner" },
];

const iS = { padding: "12px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 15, outline: "none", width: "100%" };

// Snap points as percentage of viewport height
const SNAP_HALF = 55;
const SNAP_FULL = 95;

export default function MobileActions({ lead, leadId, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("details");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Note");
  const [saving, setSaving] = useState(false);
  const [crmData, setCrmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(SNAP_HALF);
  const [editingContact, setEditingContact] = useState(false);
  const [flashField, setFlashField] = useState(null);

  // Drag state refs (no re-renders during drag)
  const sheetRef = useRef(null);
  const dragRef = useRef({ active: false, startY: 0, startHeight: 0 });

  useEffect(() => {
    fetch(`/api/leads?id=${encodeURIComponent(leadId)}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setCrmData(d.lead || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  const doAction = async (action, body) => {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action, ...body, leadAddress: lead.address, leadScope: lead.scope }),
      });
      const data = await res.json();
      if (data.lead) {
        setCrmData(data.lead);
        onUpdate?.(leadId, data.lead);
      }
    } catch {}
    setSaving(false);
  };

  const saveContact = (field, value) => {
    doAction("updateContact", { [field]: value });
  };

  const logQuickNote = (text, type) => {
    doAction("addNote", { note: text, author: currentUser?.name || "Unknown", type: type || "Note" });
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
    // Snap to nearest point or dismiss
    if (sheetHeight < 35) {
      onClose();
    } else if (sheetHeight < (SNAP_HALF + SNAP_FULL) / 2) {
      setSheetHeight(SNAP_HALF);
    } else {
      setSheetHeight(SNAP_FULL);
    }
  }, [sheetHeight, onClose]);

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: CARD, width: "100%", maxWidth: 500, borderRadius: "16px 16px 0 0", padding: 20, color: MUTED }}>Loading...</div>
    </div>
  );

  const status = crmData?.status || "New";
  const assignee = crmData?.assignee || "";
  const phone = crmData?.contactPhone || "";
  const email = crmData?.contactEmail || "";
  const contactName = crmData?.contactName || "";
  const contactRole = crmData?.contactRole || "";
  const notes = crmData?.notes || [];
  const isExpanded = sheetHeight > (SNAP_HALF + SNAP_FULL) / 2;

  // Build address for maps links
  const cleanAddr = (lead.address || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*—.*$/, "").trim();
  const fullAddr = `${cleanAddr}, ${lead.city || "Los Gatos"}, CA`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;

  // Zillow / Redfin URLs
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(cleanAddr.replace(/\s+/g, "-"))}_rb/`;
  const redfinUrl = `https://www.redfin.com/search#q=${encodeURIComponent(cleanAddr + ", " + (lead.city || "Los Gatos") + ", CA")}`;

  // Score badge color
  const scoreColor = lead.score >= 7 ? RED : lead.score >= 4 ? TEXT : MUTED;
  const scoreBg = lead.score >= 7 ? RED_DARK : lead.score >= 4 ? "#1c1c1c" : "#171717";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={sheetRef}
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

        {/* Lead header — always visible */}
        <div style={{ padding: "4px 20px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", background: scoreBg, color: scoreColor, fontWeight: 700, fontSize: 14, padding: "3px 10px", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", border: `1.5px solid ${lead.score >= 7 ? RED + "44" : "#333"}` }}>{lead.score}/10</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", flex: 1 }}>{lead.address}</div>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{lead.scope} · {lead.city || "Los Gatos"}</div>

          {/* Contact info — always visible */}
          {(contactName || phone || email) && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (phone || email) ? 6 : 0 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{contactName || "No contact"}</span>
                  {contactRole && <span style={{ fontSize: 12, color: DIM, marginLeft: 6 }}>({contactRole})</span>}
                </div>
                <button onClick={() => setEditingContact(!editingContact)} style={{ background: "none", border: "none", fontSize: 11, color: MUTED, cursor: "pointer", padding: "2px 6px" }}>
                  {editingContact ? "Done" : "Edit"}
                </button>
              </div>
              {!editingContact && (phone || email) && (
                <div style={{ display: "flex", gap: 6 }}>
                  {phone && <span style={{ fontSize: 12, color: MUTED }}>{phone}</span>}
                  {phone && email && <span style={{ color: DIM }}>·</span>}
                  {email && <span style={{ fontSize: 12, color: MUTED }}>{email}</span>}
                </div>
              )}
              {editingContact && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  <input type="text" defaultValue={contactName} onBlur={e => saveContact("contactName", e.target.value)} placeholder="Name" style={{ ...iS, fontSize: 14 }} />
                  <select defaultValue={contactRole} onChange={e => saveContact("contactRole", e.target.value)} style={{ ...iS, fontSize: 14 }}>
                    <option value="">Role...</option>
                    <option value="Owner">Owner</option>
                    <option value="Architect">Architect</option>
                    <option value="Designer">Designer</option>
                    <option value="Agent">Agent</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="tel" defaultValue={phone} onBlur={e => saveContact("contactPhone", e.target.value)} placeholder="Phone" style={{ ...iS, fontSize: 14 }} />
                  <input type="email" defaultValue={email} onBlur={e => saveContact("contactEmail", e.target.value)} placeholder="Email" style={{ ...iS, fontSize: 14 }} />
                </div>
              )}
            </div>
          )}
          {/* Show add contact prompt if no contact info at all */}
          {!contactName && !phone && !email && !editingContact && (
            <button onClick={() => setEditingContact(true)} style={{ marginTop: 8, width: "100%", padding: "10px 12px", background: BG, borderRadius: 8, border: `1px dashed ${BORDER}`, color: MUTED, fontSize: 13, cursor: "pointer" }}>
              + Add Contact Info
            </button>
          )}
          {!contactName && !phone && !email && editingContact && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button onClick={() => setEditingContact(false)} style={{ background: "none", border: "none", fontSize: 11, color: MUTED, cursor: "pointer" }}>Cancel</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="text" defaultValue="" onBlur={e => saveContact("contactName", e.target.value)} placeholder="Name" style={{ ...iS, fontSize: 14 }} />
                <select defaultValue="" onChange={e => saveContact("contactRole", e.target.value)} style={{ ...iS, fontSize: 14 }}>
                  <option value="">Role...</option>
                  <option value="Owner">Owner</option>
                  <option value="Architect">Architect</option>
                  <option value="Designer">Designer</option>
                  <option value="Agent">Agent</option>
                  <option value="Other">Other</option>
                </select>
                <input type="tel" defaultValue="" onBlur={e => saveContact("contactPhone", e.target.value)} placeholder="Phone" style={{ ...iS, fontSize: 14 }} />
                <input type="email" defaultValue="" onBlur={e => saveContact("contactEmail", e.target.value)} placeholder="Email" style={{ ...iS, fontSize: 14 }} />
              </div>
            </div>
          )}

          {/* Quick action buttons — Call, Email, Directions */}
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
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#1c1c1c", color: TEXT, fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              📍 Directions
            </a>
          </div>

          {/* Last contact */}
          {crmData?.lastContactBy && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
              Last contact: <strong style={{ color: TEXT }}>{crmData.lastContactBy}</strong> on {new Date(crmData.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, padding: "0 20px 10px", flexShrink: 0 }}>
          {[
            { id: "details", label: "Details" },
            { id: "notes", label: `Notes${notes.length ? ` (${notes.length})` : ""}` },
            { id: "followup", label: "Follow-up" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${tab === t.id ? RED : BORDER}`, background: tab === t.id ? RED_DARK : BG, color: tab === t.id ? RED : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div style={{ padding: "0 20px", flex: 1, overflowY: "auto", paddingBottom: 20 }}>

          {/* DETAILS TAB — status, assignment, value, links */}
          {tab === "details" && (
            <div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Pipeline Status</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {STATUSES.filter(s => s !== "Archived").map(s => (
                  <button key={s} onClick={() => doAction("updateStatus", { status: s })} disabled={saving} style={{ padding: "12px 10px", borderRadius: 8, border: `1px solid ${status === s ? RED : BORDER}`, background: status === s ? RED_DARK : BG, color: status === s ? RED : TEXT, fontSize: 14, fontWeight: status === s ? 700 : 400, cursor: "pointer" }}>
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Assign To</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {TEAM.map(t => (
                  <button key={t} onClick={() => doAction("updateStatus", { assignee: t })} disabled={saving} style={{ padding: "12px 10px", borderRadius: 8, border: `1px solid ${assignee === t ? RED : BORDER}`, background: assignee === t ? RED_DARK : BG, color: assignee === t ? RED : TEXT, fontSize: 14, fontWeight: assignee === t ? 700 : 400, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Est. Value */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Est. Value</div>
              <input
                type="text"
                placeholder="$0"
                defaultValue={crmData?.estValue ? `$${Number(crmData.estValue).toLocaleString()}` : ""}
                onBlur={e => doAction("updateStatus", { estValue: e.target.value.replace(/[$,]/g, "") })}
                onFocus={e => { e.target.value = crmData?.estValue || ""; }}
                style={{ ...iS, fontFamily: "'JetBrains Mono',monospace" }}
              />

              {/* Square footage */}
              {(lead.existingSF !== null || lead.proposedSF !== null) && (
                <div style={{ marginTop: 16, padding: "10px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Square Footage</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div><span style={{ fontSize: 11, color: MUTED }}>Existing: </span><span style={{ fontSize: 13, fontWeight: 600, color: lead.existingSF !== null ? TEXT : DIM, fontFamily: "'JetBrains Mono',monospace" }}>{lead.existingSF !== null ? (lead.existingSF === 0 ? "Vacant" : `${lead.existingSF.toLocaleString()} SF`) : "—"}</span></div>
                    <div><span style={{ fontSize: 11, color: MUTED }}>Proposed: </span><span style={{ fontSize: 13, fontWeight: 600, color: lead.proposedSF !== null ? TEXT : DIM, fontFamily: "'JetBrains Mono',monospace" }}>{lead.proposedSF !== null ? `${lead.proposedSF.toLocaleString()} SF` : "—"}</span></div>
                  </div>
                </div>
              )}

              {/* Project links */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
                {lead.pageUrl && (
                  <a href={lead.pageUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "10px 16px", borderRadius: 8, background: RED, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                    View Project
                  </a>
                )}
                <a href={zillowUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: BG, color: MUTED, fontSize: 13, fontWeight: 500, textDecoration: "none", border: `1px solid ${BORDER}`, flex: 1, justifyContent: "center" }}>
                  Zillow
                </a>
                <a href={redfinUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: BG, color: MUTED, fontSize: 13, fontWeight: 500, textDecoration: "none", border: `1px solid ${BORDER}`, flex: 1, justifyContent: "center" }}>
                  Redfin
                </a>
              </div>

              {/* Document links */}
              {lead.docs?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {lead.docs.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: BG, color: MUTED, fontSize: 12, fontWeight: 500, textDecoration: "none", border: `1px solid ${BORDER}` }}>
                      📄 {d.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB — quick-log + typed freeform + history */}
          {tab === "notes" && (
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

              {/* Freeform note with type selector */}
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Log Interaction</div>
              <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...iS, marginBottom: 8, color: TYPE_COLORS[noteType] || MUTED, fontWeight: 600 }}>
                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Met with owner, discussed timeline..." rows={3} style={{ ...iS, resize: "vertical", fontFamily: "inherit", minHeight: 80 }} />
              <button onClick={() => { if (noteText.trim()) { doAction("addNote", { note: noteText.trim(), author: currentUser?.name || "Unknown", type: noteType }); setNoteText(""); } }} disabled={!noteText.trim() || saving} style={{ marginTop: 8, width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4 }}>
                {saving ? "Saving..." : "Log"}
              </button>

              {/* Notes history with type badges — show all when expanded, 5 when half */}
              {notes.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 8 }}>History ({notes.length})</div>
                  {notes.slice(0, isExpanded ? undefined : 5).map((n, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                      {n.type && n.type !== "Note" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${TYPE_COLORS[n.type] || MUTED}22`, color: TYPE_COLORS[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 1 }}>{n.type}</span>}
                      <div>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                        <span style={{ color: DIM, marginLeft: 6, fontSize: 11 }}>
                          {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <div style={{ color: MUTED, marginTop: 2 }}>{n.text}</div>
                      </div>
                    </div>
                  ))}
                  {!isExpanded && notes.length > 5 && (
                    <button onClick={() => setSheetHeight(SNAP_FULL)} style={{ background: "none", border: "none", color: RED, fontSize: 12, cursor: "pointer", padding: 0 }}>
                      Show all {notes.length} notes ↑
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FOLLOW-UP TAB */}
          {tab === "followup" && (
            <div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Set Follow-up Date</div>
              <DatePicker value={crmData?.followUpDate || ""} onChange={date => doAction("setFollowUp", { followUpDate: date, assignee: crmData?.assignee || "" })} placeholder="Set follow-up" />
              {crmData?.followUpDate && (
                <div style={{ marginTop: 10, fontSize: 14, color: TEXT }}>
                  Current: {new Date(crmData.followUpDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </div>
              )}
              {crmData?.lastContactBy && (
                <div style={{ marginTop: 12, fontSize: 12, color: DIM }}>
                  Last contact: {crmData.lastContactBy} on {new Date(crmData.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
