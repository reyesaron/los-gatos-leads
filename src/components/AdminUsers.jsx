'use client';
import { useState, useEffect } from "react";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const STATUS_COLORS = {
  approved: { bg: "#052e16", fg: "#4ade80" },
  pending: { bg: "#422006", fg: "#fbbf24" },
  rejected: { bg: "#1c1c1c", fg: "#525252" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/auth/admin?_t=${Date.now()}`).then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const doAction = async (action, userId) => {
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {}
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: MUTED }}>Loading users...</div>;

  const pending = users.filter(u => u.status === "pending");
  const approved = users.filter(u => u.status === "approved");
  const rejected = users.filter(u => u.status === "rejected");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 20px 40px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 16 }}>User Management</div>

      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Pending Approval ({pending.length})</div>
          {pending.map(u => (
            <div key={u.id} style={{ background: CARD, borderRadius: 6, border: `1px solid #fbbf2433`, padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{u.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{u.email} · Requested {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <button onClick={() => doAction("approve", u.id)} style={{ padding: "5px 12px", borderRadius: 4, border: "none", background: "#052e16", color: "#4ade80", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Approve</button>
              <button onClick={() => doAction("reject", u.id)} style={{ padding: "5px 12px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 11, cursor: "pointer" }}>Reject</button>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 8 }}>Active Users ({approved.length})</div>
      {approved.map(u => (
        <div key={u.id} style={{ background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{u.name}</span>
              {u.role === "admin" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${RED}22`, color: RED, fontWeight: 600 }}>ADMIN</span>}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>{u.email}</div>
          </div>
          {u.role !== "admin" && (
            <button onClick={() => doAction("makeAdmin", u.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: MUTED, fontSize: 10, cursor: "pointer" }}>Make Admin</button>
          )}
          {u.role === "admin" && (
            <button onClick={() => doAction("removeAdmin", u.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 10, cursor: "pointer" }}>Remove Admin</button>
          )}
          <button onClick={() => doAction("delete", u.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 10, cursor: "pointer" }}>Delete</button>
        </div>
      ))}

      {rejected.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16, marginBottom: 8 }}>Rejected ({rejected.length})</div>
          {rejected.map(u => (
            <div key={u.id} style={{ background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, padding: "10px 14px", marginBottom: 4, display: "flex", alignItems: "center", gap: 10, opacity: 0.5 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: MUTED }}>{u.name}</div>
                <div style={{ fontSize: 11, color: DIM }}>{u.email}</div>
              </div>
              <button onClick={() => doAction("approve", u.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: MUTED, fontSize: 10, cursor: "pointer" }}>Approve</button>
              <button onClick={() => doAction("delete", u.id)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: BG, color: DIM, fontSize: 10, cursor: "pointer" }}>Delete</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
