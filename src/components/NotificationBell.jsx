'use client';
import { useState, useMemo } from "react";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

export default function NotificationBell({ scored, crmData, activityFeed, currentUser }) {
  const [open, setOpen] = useState(false);

  const lastSeen = useMemo(() => {
    if (typeof window === "undefined") return new Date().toISOString();
    return localStorage.getItem("apex-last-seen") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }, []);

  const markSeen = () => {
    if (typeof window !== "undefined") localStorage.setItem("apex-last-seen", new Date().toISOString());
  };

  const notifications = useMemo(() => {
    const items = [];

    // 1. New high-scoring leads (7+) — recent
    for (const p of scored) {
      if (p.score >= 7 && p.isNew) {
        items.push({ type: "hot", text: `New hot lead: ${p.address}`, detail: `Score ${p.score}/10 · ${p.scope}`, time: p.dateFiled || "", priority: 1 });
      }
    }

    // 2. Overdue follow-ups assigned to current user (or all if no user selected)
    for (const p of scored) {
      if (p._overdue) {
        const crm = crmData[p._leadId] || {};
        if (!currentUser || crm.assignee === currentUser || crm.followUpAssignee === currentUser) {
          items.push({ type: "overdue", text: `Overdue: ${p.address}`, detail: `Follow-up was ${p._crmFollowUp}${crm.assignee ? ` · ${crm.assignee}` : ""}`, time: p._crmFollowUp, priority: 0 });
        }
      }
    }

    // 3. Follow-ups due within 2 days
    for (const p of scored) {
      if (p._followUpSoon) {
        const crm = crmData[p._leadId] || {};
        if (!currentUser || crm.assignee === currentUser || crm.followUpAssignee === currentUser) {
          items.push({ type: "soon", text: `Follow-up soon: ${p.address}`, detail: `Due ${p._crmFollowUp}${crm.assignee ? ` · ${crm.assignee}` : ""}`, time: p._crmFollowUp, priority: 2 });
        }
      }
    }

    // 4. Recent teammate activity on leads assigned to current user
    if (currentUser) {
      for (const item of activityFeed.slice(0, 50)) {
        if (item.author !== currentUser && new Date(item.timestamp) > new Date(lastSeen)) {
          // Check if this lead is assigned to current user
          const crm = crmData[item.leadId] || {};
          if (crm.assignee === currentUser) {
            items.push({ type: "team", text: `${item.author} on your lead: ${item.address}`, detail: item.text.slice(0, 60), time: item.timestamp, priority: 3 });
          }
        }
      }
    }

    items.sort((a, b) => a.priority - b.priority);
    return items;
  }, [scored, crmData, activityFeed, currentUser, lastSeen]);

  const count = notifications.length;
  const typeColors = { hot: RED, overdue: "#fb923c", soon: "#fbbf24", team: "#60a5fa" };
  const typeLabels = { hot: "HOT LEAD", overdue: "OVERDUE", soon: "DUE SOON", team: "TEAM" };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Bell */}
        <button onClick={() => { setOpen(!open); if (!open) markSeen(); }} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, color: count > 0 ? TEXT : DIM }}>
          🔔
          {count > 0 && (
            <span className="badge-new" style={{ position: "absolute", top: -2, right: -4, background: RED, color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{count > 9 ? "9+" : count}</span>
          )}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="apex-notif-dropdown" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 340, maxHeight: 400, overflowY: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 600, color: TEXT }}>
            Notifications {count > 0 && <span style={{ color: MUTED, fontWeight: 400 }}>({count})</span>}
          </div>
          {notifications.length === 0 && (
            <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: MUTED }}>All clear{currentUser ? `, ${currentUser}` : ""}. No alerts right now.</div>
          )}
          {notifications.map((n, i) => (
            <div key={i} style={{ padding: "8px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${typeColors[n.type]}22`, color: typeColors[n.type], whiteSpace: "nowrap", marginTop: 2 }}>{typeLabels[n.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.3 }}>{n.text}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{n.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
