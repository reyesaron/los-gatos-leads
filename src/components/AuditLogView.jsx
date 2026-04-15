'use client';
import { useState, useEffect } from "react";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const iS = { padding: "6px 10px", borderRadius: 5, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 12, outline: "none" };

const ACTION_COLORS = {
  login_success: "#4ade80",
  login_failure: "#fb923c",
  login_lockout: RED,
  lead_updateStatus: "#60a5fa",
  lead_addNote: "#a78bfa",
  lead_setFollowUp: "#fbbf24",
  lead_setContact: MUTED,
  lead_setSource: MUTED,
  lead_setEstValue: MUTED,
  manual_lead_add: "#4ade80",
  architects_add: "#60a5fa",
  architects_delete: RED,
  designers_add: "#60a5fa",
  designers_delete: RED,
  realtors_add: "#60a5fa",
  realtors_delete: RED,
};

export default function AuditLogView() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: "", user: "", search: "", start: "", end: "" });
  const [filterOptions, setFilterOptions] = useState({ actions: [], users: [] });
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    fetch(`/api/audit?filters=true&_t=${Date.now()}`).then(r => r.json()).then(d => setFilterOptions(d)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", LIMIT);
    params.set("offset", page * LIMIT);
    if (filters.action) params.set("action", filters.action);
    if (filters.user) params.set("user", filters.user);
    if (filters.search) params.set("search", filters.search);
    if (filters.start) params.set("start", filters.start);
    if (filters.end) params.set("end", filters.end);
    params.set("_t", Date.now());

    fetch(`/api/audit?${params}`).then(r => r.json()).then(d => {
      setEntries(d.entries || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, filters]);

  const exportCSV = () => {
    const headers = ["Timestamp", "Action", "User", "Email", "Role", "IP", "Target Type", "Target ID", "Details"];
    const rows = entries.map(e => [
      e.timestamp, e.action, e.user_name || "", e.user_email || "", e.user_role || "",
      e.ip || "", e.target_type || "", e.target_id || "", (e.details || "").replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "14px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, flex: 1 }}>
          Audit Log
          <span style={{ fontSize: 12, color: MUTED, fontWeight: 400, marginLeft: 8 }}>{total} events</span>
        </div>
        <button onClick={exportCSV} style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${BORDER}`, background: CARD, color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export CSV</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(0); }} style={{ ...iS, width: 160 }}>
          <option value="">All Actions</option>
          {filterOptions.actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.user} onChange={e => { setFilters(f => ({ ...f, user: e.target.value })); setPage(0); }} style={{ ...iS, width: 180 }}>
          <option value="">All Users</option>
          {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="text" placeholder="Search details..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(0); }} style={{ ...iS, width: 160 }} />
        <input type="date" value={filters.start} onChange={e => { setFilters(f => ({ ...f, start: e.target.value })); setPage(0); }} style={{ ...iS, width: 130 }} />
        <span style={{ color: DIM, fontSize: 11, alignSelf: "center" }}>to</span>
        <input type="date" value={filters.end} onChange={e => { setFilters(f => ({ ...f, end: e.target.value })); setPage(0); }} style={{ ...iS, width: 130 }} />
        {(filters.action || filters.user || filters.search || filters.start || filters.end) && (
          <button onClick={() => { setFilters({ action: "", user: "", search: "", start: "", end: "" }); setPage(0); }} style={{ ...iS, cursor: "pointer", color: RED, border: `1px solid ${RED}33` }}>Clear</button>
        )}
      </div>

      {/* Log entries */}
      {loading && <div style={{ padding: 20, textAlign: "center", color: MUTED }}>Loading...</div>}
      {!loading && entries.length === 0 && <div style={{ padding: 40, textAlign: "center", color: MUTED }}>No audit events found.</div>}
      {entries.map((e, i) => {
        const color = ACTION_COLORS[e.action] || MUTED;
        return (
          <div key={i} style={{ background: CARD, borderRadius: 6, border: `1px solid ${BORDER}`, padding: "8px 12px", marginBottom: 3, display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: `${color}22`, color, whiteSpace: "nowrap", marginTop: 1, minWidth: 80, textAlign: "center" }}>{e.action}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {e.user_name && <span style={{ color: TEXT, fontWeight: 600 }}>{e.user_name}</span>}
                {e.user_email && <span style={{ color: DIM }}>{e.user_email}</span>}
                <span style={{ color: DIM, marginLeft: "auto", fontSize: 10 }}>
                  {new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              {e.details && <div style={{ color: MUTED, marginTop: 2 }}>{e.details}</div>}
              <div style={{ color: DIM, marginTop: 2, fontSize: 10 }}>
                {e.ip && <span>IP: {e.ip}</span>}
                {e.target_id && <span style={{ marginLeft: 12 }}>Target: {e.target_id}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...iS, cursor: page > 0 ? "pointer" : "default", opacity: page > 0 ? 1 : 0.3 }}>Previous</button>
          <span style={{ color: MUTED, fontSize: 11, alignSelf: "center" }}>Page {page + 1} of {Math.ceil(total / LIMIT)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= total} style={{ ...iS, cursor: (page + 1) * LIMIT < total ? "pointer" : "default", opacity: (page + 1) * LIMIT < total ? 1 : 0.3 }}>Next</button>
        </div>
      )}
    </div>
  );
}
