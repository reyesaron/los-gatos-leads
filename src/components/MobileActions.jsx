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
const STATUSES = ["New", "Contacted", "Meeting Set", "Proposal Sent", "Won", "Lost", "Archived"];

const iS = { padding: "12px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 15, outline: "none", width: "100%" };

export default function MobileActions({ lead, leadId, onUpdate, onClose, currentUser }) {
  const [tab, setTab] = useState("status"); // status, note, followup
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [crmData, setCrmData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: CARD, width: "100%", maxWidth: 500, borderRadius: "16px 16px 0 0", padding: 20, color: MUTED }}>Loading...</div>
    </div>
  );

  const status = crmData?.status || "New";
  const assignee = crmData?.assignee || "";
  const phone = crmData?.contactPhone || "";
  const email = crmData?.contactEmail || "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: CARD, width: "100%", maxWidth: 500, borderRadius: "16px 16px 0 0", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Handle bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: DIM }} />
        </div>

        {/* Lead info header */}
        <div style={{ padding: "8px 20px 12px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{lead.address}</div>
          <div style={{ fontSize: 13, color: MUTED }}>{lead.scope} · {lead.city || "Los Gatos"}</div>

          {/* Click-to-call / email */}
          {(phone || email) && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#052e16", color: "#4ade80", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                  📞 Call {crmData?.contactName?.split(" ")[0] || "Contact"}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 8, background: "#172554", color: "#60a5fa", fontSize: 14, fontWeight: 600, textDecoration: "none", flex: 1, justifyContent: "center" }}>
                  ✉ Email
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, padding: "0 20px 12px" }}>
          {[
            { id: "status", label: "Status" },
            { id: "note", label: "Add Note" },
            { id: "followup", label: "Follow-up" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${tab === t.id ? RED : BORDER}`, background: tab === t.id ? RED_DARK : BG, color: tab === t.id ? RED : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 20px 24px" }}>
          {/* STATUS TAB */}
          {tab === "status" && (
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
            </div>
          )}

          {/* NOTE TAB */}
          {tab === "note" && (
            <div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 8 }}>Quick Note</div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Met with owner, discussed timeline..." rows={4} style={{ ...iS, resize: "vertical", fontFamily: "inherit", minHeight: 100 }} autoFocus />
              <button onClick={() => { if (noteText.trim()) { doAction("addNote", { note: noteText.trim(), author: currentUser?.name || "Unknown" }); setNoteText(""); } }} disabled={!noteText.trim() || saving} style={{ marginTop: 8, width: "100%", padding: "14px 0", borderRadius: 8, border: "none", background: noteText.trim() ? RED : "#1c1c1c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: noteText.trim() ? "pointer" : "default", opacity: noteText.trim() ? 1 : 0.4 }}>
                {saving ? "Saving..." : "Log Note"}
              </button>

              {/* Recent notes */}
              {crmData?.notes?.length > 0 && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>Recent</div>
                  {crmData.notes.slice(0, 3).map((n, i) => (
                    <div key={i} style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
                      <span style={{ color: TEXT, fontWeight: 600 }}>{n.author}</span>
                      <span style={{ color: DIM, marginLeft: 6, fontSize: 10 }}>{new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <div style={{ color: MUTED, marginTop: 2 }}>{n.text}</div>
                    </div>
                  ))}
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
                <div style={{ marginTop: 8, fontSize: 13, color: TEXT }}>
                  Current: {new Date(crmData.followUpDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
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
