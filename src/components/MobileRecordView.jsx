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

const TEAM = ["Daniel", "Aron", "Joseph"];
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

// Status pill row — shared component for both pipeline and relationship
function StatusPills({ statuses, current, colors, onSelect, saving }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
      {statuses.map(s => {
        const isActive = current === s;
        const color = colors?.[s] || (isActive ? RED : TEXT);
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            disabled={saving}
            style={{
              padding: "8px 14px", borderRadius: 20, whiteSpace: "nowrap",
              border: `1.5px solid ${isActive ? color : BORDER}`,
              background: isActive ? `${color}22` : BG,
              color: isActive ? color : MUTED,
              fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// Toast notification
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#1c1c1c", color: TEXT, padding: "10px 20px", borderRadius: 10,
      fontSize: 14, fontWeight: 500, zIndex: 10000, border: `1px solid ${BORDER}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)", animation: "fadeInUp 0.2s ease-out",
    }}>
      {message}
    </div>
  );
}

// ── LOG TAB (shared) ──────────────────────────────────────────────
function LogTab({ notes, onLog, saving, flashField, currentUser, onViewAll }) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("Note");
  const [contactDate, setContactDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <div style={{ padding: "0 20px" }}>
      {/* Contact date — defaults to today */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600, flexShrink: 0 }}>Date:</span>
        <input
          type="date"
          value={contactDate}
          onChange={e => setContactDate(e.target.value)}
          style={{ ...iS, flex: 1, fontSize: 14 }}
        />
        {contactDate !== new Date().toISOString().split("T")[0] && (
          <button onClick={() => setContactDate(new Date().toISOString().split("T")[0])} style={{ background: "none", border: "none", color: RED, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Today</button>
        )}
      </div>

      {/* Quick-log buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
        {QUICK_NOTES.map(q => (
          <button
            key={q.text}
            onClick={() => onLog(q.text, q.type, contactDate)}
            disabled={saving}
            style={{
              padding: "11px 10px", borderRadius: 8,
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

      {/* Freeform */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...iS, flex: 1, color: TYPE_COLORS[noteType] || MUTED, fontWeight: 600 }}>
          {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note..."
          onKeyDown={e => { if (e.key === "Enter" && noteText.trim()) { onLog(noteText.trim(), noteType, contactDate); setNoteText(""); } }}
          style={{ ...iS, flex: 1 }}
        />
        <button
          onClick={() => { if (noteText.trim()) { onLog(noteText.trim(), noteType, contactDate); setNoteText(""); } }}
          disabled={!noteText.trim() || saving}
          style={{ padding: "12px 18px", borderRadius: 8, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4, flexShrink: 0 }}
        >
          Log
        </button>
      </div>

      {/* Recent notes — max 3, then "View all" */}
      {notes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>Recent</div>
          {notes.slice(0, 3).map((n, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.4, display: "flex", gap: 6, alignItems: "flex-start" }}>
              {n.type && n.type !== "Note" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${TYPE_COLORS[n.type] || MUTED}22`, color: TYPE_COLORS[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 1 }}>{n.type}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                <span style={{ color: "#fff", marginLeft: 6, fontSize: 12, fontWeight: 500 }}>
                  {new Date((n.contactDate || n.timestamp) + (n.contactDate ? "T12:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <div style={{ color: MUTED, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.text || n.note}</div>
              </div>
            </div>
          ))}
          {notes.length > 3 && (
            <button onClick={onViewAll} style={{ background: "none", border: "none", color: RED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              View all {notes.length} notes →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── NEXT TOUCH TAB (shared) ───────────────────────────────────────
function NextTouchTab({ touchDate, lastContactBy, lastContactAt, onSetDate, saving }) {
  return (
    <div style={{ padding: "0 20px" }}>
      <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Next Touch Date</div>
      <DatePicker value={touchDate || ""} onChange={onSetDate} placeholder="Set date" />
      {touchDate && (
        <div style={{ marginTop: 10, fontSize: 14, color: TEXT }}>
          {new Date(touchDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      )}
      {lastContactBy && (
        <div style={{ marginTop: 16, padding: "10px 12px", background: BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 12, color: MUTED }}>Last contact</div>
          <div style={{ fontSize: 14, color: TEXT, marginTop: 4 }}>
            <strong>{lastContactBy}</strong> · {lastContactAt ? new Date(lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ALL NOTES VIEW (sub-screen) ───────────────────────────────────
function AllNotesView({ notes, onBack }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 9999, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: RED, fontSize: 16, cursor: "pointer", padding: "4px" }}>← Back</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>All Notes ({notes.length})</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {notes.map((n, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < notes.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", gap: 8, alignItems: "flex-start" }}>
            {n.type && n.type !== "Note" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${TYPE_COLORS[n.type] || MUTED}22`, color: TYPE_COLORS[n.type] || MUTED, whiteSpace: "nowrap", marginTop: 2 }}>{n.type}</span>}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{n.author}</span>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>
                  {new Date((n.contactDate || n.timestamp) + (n.contactDate ? "T12:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div style={{ color: MUTED, marginTop: 4, fontSize: 14, lineHeight: 1.5 }}>{n.text || n.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// LEAD RECORD VIEW
// ══════════════════════════════════════════════════════════════════
export function MobileLeadView({ lead, leadId, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [crmData, setCrmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flashField, setFlashField] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

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

  const showToast = (msg) => { setToast(msg); };
  const logNote = (text, type, contactDate) => {
    doAction("addNote", { note: text, author: currentUser?.name || "Unknown", type, contactDate });
    setFlashField(text);
    setTimeout(() => setFlashField(null), 800);
    showToast(`${type} logged`);
  };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: MUTED, fontSize: 15 }}>Loading...</div>
    </div>
  );

  const status = crmData?.status || "New";
  const assignee = crmData?.assignee || "";
  const phone = crmData?.contactPhone || "";
  const email = crmData?.contactEmail || "";
  const contactName = crmData?.contactName || "";
  const contactRole = crmData?.contactRole || "";
  const notes = crmData?.notes || [];

  const cleanAddr = (lead.address || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*—.*$/, "").trim();
  const fullAddr = `${cleanAddr}, ${lead.city || "Los Gatos"}, CA`;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(cleanAddr.replace(/\s+/g, "-"))}_rb/`;
  const redfinUrl = `https://www.redfin.com/search#q=${encodeURIComponent(cleanAddr + ", " + (lead.city || "Los Gatos") + ", CA")}`;

  const scoreColor = lead.score >= 7 ? RED : lead.score >= 4 ? TEXT : MUTED;
  const scoreBg = lead.score >= 7 ? RED_DARK : lead.score >= 4 ? "#1c1c1c" : "#171717";

  const PIPELINE = ["New", "Contacted", "Meeting Set", "Proposal Sent", "Won", "Lost"];
  const PIPELINE_COLORS = { New: MUTED, Contacted: "#60a5fa", "Meeting Set": "#fbbf24", "Proposal Sent": "#a78bfa", Won: "#4ade80", Lost: "#525252" };

  if (showAllNotes) return <AllNotesView notes={notes} onBack={() => setShowAllNotes(false)} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 9998, display: "flex", flexDirection: "column" }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── FIXED HEADER ── */}
      <div style={{ padding: "14px 20px 10px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: RED, fontSize: 16, cursor: "pointer", padding: "4px 0", fontWeight: 600 }}>← Back</button>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.address}</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", background: scoreBg, color: scoreColor, fontWeight: 700, fontSize: 14, padding: "3px 10px", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", border: `1.5px solid ${lead.score >= 7 ? RED + "44" : "#333"}`, flexShrink: 0 }}>{lead.score}/10</span>
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{lead.scope} · {lead.city || "Los Gatos"}</div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#052e16", color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              📞 Call
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#172554", color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              ✉ Email
            </a>
          )}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#1c1c1c", color: TEXT, fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
            📍 Dir
          </a>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* DETAILS TAB */}
        {tab === "details" && (
          <div style={{ padding: "14px 20px" }}>
            {/* Pipeline status pills */}
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pipeline</div>
            <StatusPills
              statuses={PIPELINE}
              current={status}
              colors={PIPELINE_COLORS}
              onSelect={s => { doAction("updateStatus", { status: s }); showToast(`Status → ${s}`); }}
              saving={saving}
            />

            {/* Assignee pills */}
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Assigned To</div>
            <StatusPills
              statuses={TEAM}
              current={assignee}
              onSelect={t => { doAction("updateStatus", { assignee: t }); showToast(`Assigned → ${t}`); }}
              saving={saving}
            />

            {/* Contact info card */}
            <div style={{ marginTop: 14, padding: "10px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contact</div>
                <button onClick={() => setEditingContact(!editingContact)} style={{ background: "none", border: "none", fontSize: 12, color: RED, cursor: "pointer", fontWeight: 600 }}>
                  {editingContact ? "Done" : contactName ? "Edit" : "+ Add"}
                </button>
              </div>
              {!editingContact && (contactName || phone || email) && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{contactName || "—"}{contactRole && <span style={{ fontSize: 12, color: DIM, fontWeight: 400, marginLeft: 6 }}>({contactRole})</span>}</div>
                  {phone && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{phone}</div>}
                  {email && <div style={{ fontSize: 13, color: MUTED, marginTop: 1 }}>{email}</div>}
                </div>
              )}
              {!editingContact && !contactName && !phone && !email && (
                <div style={{ fontSize: 13, color: DIM, fontStyle: "italic" }}>No contact info yet</div>
              )}
              {editingContact && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <input type="text" defaultValue={contactName} onBlur={e => doAction("setContact", { contactName: e.target.value })} placeholder="Name" style={{ ...iS, fontSize: 14 }} />
                  <select defaultValue={contactRole} onChange={e => doAction("setContact", { contactRole: e.target.value })} style={{ ...iS, fontSize: 14 }}>
                    <option value="">Role...</option>
                    <option value="Owner">Owner</option>
                    <option value="Architect">Architect</option>
                    <option value="Designer">Designer</option>
                    <option value="Agent">Agent</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="tel" defaultValue={phone} onBlur={e => doAction("setContact", { contactPhone: e.target.value })} placeholder="Phone" style={{ ...iS, fontSize: 14 }} />
                  <input type="email" defaultValue={email} onBlur={e => doAction("setContact", { contactEmail: e.target.value })} placeholder="Email" style={{ ...iS, fontSize: 14 }} />
                </div>
              )}
            </div>

            {/* Est. Value + Square Footage — compact row */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, padding: "10px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Est. Value</div>
                <input
                  type="text" placeholder="$0"
                  defaultValue={crmData?.estValue ? `$${Number(crmData.estValue).toLocaleString()}` : ""}
                  onBlur={e => { doAction("updateStatus", { estValue: e.target.value.replace(/[$,]/g, "") }); showToast("Value updated"); }}
                  onFocus={e => { e.target.value = crmData?.estValue || ""; }}
                  style={{ background: "transparent", border: "none", color: TEXT, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", outline: "none", width: "100%", padding: 0 }}
                />
              </div>
              {(lead.existingSF !== null || lead.proposedSF !== null) && (
                <div style={{ flex: 1, padding: "10px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Square Footage</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, fontFamily: "'JetBrains Mono',monospace" }}>
                    {lead.proposedSF !== null ? `${lead.proposedSF.toLocaleString()} SF` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: DIM }}>{lead.existingSF !== null ? (lead.existingSF === 0 ? "Vacant lot" : `From ${lead.existingSF.toLocaleString()} SF`) : ""}</div>
                </div>
              )}
            </div>

            {/* Project links — compact row */}
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {lead.pageUrl && <a href={lead.pageUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 8, background: RED, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View Project</a>}
              <a href={zillowUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 8, background: CARD, color: MUTED, fontSize: 13, fontWeight: 500, textDecoration: "none", border: `1px solid ${BORDER}` }}>Zillow</a>
              <a href={redfinUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 8, background: CARD, color: MUTED, fontSize: 13, fontWeight: 500, textDecoration: "none", border: `1px solid ${BORDER}` }}>Redfin</a>
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {tab === "log" && (
          <div style={{ paddingTop: 14 }}>
            <LogTab
              notes={notes}
              onLog={logNote}
              saving={saving}
              flashField={flashField}
              currentUser={currentUser}
              onViewAll={() => setShowAllNotes(true)}
            />
          </div>
        )}

        {/* NEXT TOUCH TAB */}
        {tab === "touch" && (
          <div style={{ paddingTop: 14 }}>
            <NextTouchTab
              touchDate={crmData?.followUpDate}
              lastContactBy={crmData?.lastContactBy}
              lastContactAt={crmData?.lastContactAt}
              onSetDate={date => { doAction("setFollowUp", { followUpDate: date, assignee: crmData?.assignee || "" }); showToast(date ? "Follow-up set" : "Follow-up cleared"); }}
              saving={saving}
            />
          </div>
        )}
      </div>

      {/* ── FIXED BOTTOM TAB BAR ── */}
      <div style={{ display: "flex", borderTop: `1px solid ${BORDER}`, background: CARD, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { id: "details", label: "Details" },
          { id: "log", label: "Log" },
          { id: "touch", label: "Next Touch" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 0", background: "transparent", border: "none",
            color: tab === t.id ? RED : MUTED, fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", borderTop: tab === t.id ? `2px solid ${RED}` : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// CONTACT RECORD VIEW
// ══════════════════════════════════════════════════════════════════
export function MobileContactView({ contact, apiPath, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("info");
  const [saving, setSaving] = useState(false);
  const [flashField, setFlashField] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAllNotes, setShowAllNotes] = useState(false);

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

  const showToast = (msg) => { setToast(msg); };
  const logNote = (text, type, contactDate) => {
    doAction("addInteraction", { type, note: text, author: currentUser?.name || "Unknown", contactDate });
    setFlashField(text);
    setTimeout(() => setFlashField(null), 800);
    showToast(`${type} logged`);
  };

  const phone = contact.phone || "";
  const email = contact.email || "";
  const url = contact.url || "";
  const interactions = contact.interactions || [];

  const firmSearch = contact.firm ? `${contact.firm}, ${(contact.cities || [])[0] || "San Jose"}, CA` : "";
  const mapsUrl = firmSearch ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(firmSearch)}` : "";

  const REL_STATUSES = ["New", "Reached Out", "Connected", "Active Referrer", "Inactive"];
  const REL_COLORS = { New: MUTED, "Reached Out": "#60a5fa", Connected: "#4ade80", "Active Referrer": RED, Inactive: DIM };

  if (showAllNotes) return <AllNotesView notes={interactions} onBack={() => setShowAllNotes(false)} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 9998, display: "flex", flexDirection: "column" }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── FIXED HEADER ── */}
      <div style={{ padding: "14px 20px 10px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: RED, fontSize: 16, cursor: "pointer", padding: "4px 0", fontWeight: 600 }}>← Back</button>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.name}</div>
          </div>
          {contact.projectCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", background: RED_DARK, color: RED, fontWeight: 700, fontSize: 13, padding: "3px 10px", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", border: `1.5px solid ${RED}44`, flexShrink: 0 }}>{contact.projectCount}</span>
          )}
        </div>
        {contact.firm && <div style={{ fontSize: 13, color: MUTED }}>{contact.firm}</div>}
        {contact.specialty && <div style={{ fontSize: 12, color: DIM, marginTop: 2 }}>{contact.specialty}</div>}

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {phone && (
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#052e16", color: "#4ade80", fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              📞 Call
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#172554", color: "#60a5fa", fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              ✉ Email
            </a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, background: "#1c1c1c", color: TEXT, fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
              📍 Dir
            </a>
          )}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* INFO TAB */}
        {tab === "info" && (
          <div style={{ padding: "14px 20px" }}>
            {/* Relationship status pills */}
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Relationship</div>
            <StatusPills
              statuses={REL_STATUSES}
              current={contact.relationshipStatus || "New"}
              colors={REL_COLORS}
              onSelect={s => {
                if (s === "Inactive" && !confirm(`Move ${contact.name} to inactive?`)) return;
                doAction("setRelationship", { relationshipStatus: s });
                showToast(`Relationship → ${s}`);
              }}
              saving={saving}
            />

            {/* Contact details card */}
            <div style={{ marginTop: 14, padding: "10px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {phone && <div style={{ fontSize: 14, color: TEXT }}>📞 <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ color: TEXT, textDecoration: "none" }}>{phone}</a></div>}
                {email && <div style={{ fontSize: 14 }}>✉ <a href={`mailto:${email}`} style={{ color: "#60a5fa", textDecoration: "none" }}>{email}</a></div>}
                {url && <div style={{ fontSize: 14 }}>🌐 <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>{url.replace(/^https?:\/\//, "")}</a></div>}
                {contact.socials && <div style={{ fontSize: 14 }}>📱 <a href={contact.socials.startsWith("http") ? contact.socials : `https://${contact.socials}`} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>{contact.socials}</a></div>}
              </div>
              {contact.notes && <div style={{ fontSize: 13, color: DIM, fontStyle: "italic", marginTop: 8, lineHeight: 1.4 }}>{contact.notes}</div>}
            </div>

            {/* Cities */}
            {(contact.cities || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Active Cities</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {contact.cities.map(c => <span key={c} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, background: CARD, color: MUTED, border: `1px solid ${BORDER}` }}>{c}</span>)}
                </div>
              </div>
            )}

            {/* Referrals */}
            {(() => {
              const referrals = interactions.filter(n => n.type === "Referral");
              const projects = contact.projects || [];
              const allRefs = [...new Set([...projects, ...referrals.map(r => r.note)])].filter(Boolean);
              if (allRefs.length === 0) return null;
              return (
                <div style={{ marginTop: 12, padding: "10px 12px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginBottom: 6 }}>{allRefs.length} REFERRAL{allRefs.length !== 1 ? "S" : ""}</div>
                  {allRefs.map((r, i) => <div key={i} style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>{r}</div>)}
                </div>
              );
            })()}
          </div>
        )}

        {/* LOG TAB */}
        {tab === "log" && (
          <div style={{ paddingTop: 14 }}>
            <LogTab
              notes={interactions}
              onLog={logNote}
              saving={saving}
              flashField={flashField}
              currentUser={currentUser}
              onViewAll={() => setShowAllNotes(true)}
            />
          </div>
        )}

        {/* NEXT TOUCH TAB */}
        {tab === "touch" && (
          <div style={{ paddingTop: 14 }}>
            <NextTouchTab
              touchDate={contact.nextTouchDate}
              lastContactBy={contact.lastInteractionBy}
              lastContactAt={contact.lastInteraction}
              onSetDate={date => { doAction("setNextTouch", { nextTouchDate: date }); showToast(date ? "Next touch set" : "Touch date cleared"); }}
              saving={saving}
            />
          </div>
        )}
      </div>

      {/* ── FIXED BOTTOM TAB BAR ── */}
      <div style={{ display: "flex", borderTop: `1px solid ${BORDER}`, background: CARD, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[
          { id: "info", label: "Info" },
          { id: "log", label: "Log" },
          { id: "touch", label: "Next Touch" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 0", background: "transparent", border: "none",
            color: tab === t.id ? RED : MUTED, fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", borderTop: tab === t.id ? `2px solid ${RED}` : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
