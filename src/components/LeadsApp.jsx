'use client';
import { useState, useMemo, useEffect, useCallback } from "react";
import { getLeadScore } from "@/data/scoring";
import CRMPanel from "@/components/CRMPanel";
import NotificationBell from "@/components/NotificationBell";
import ContactsView from "@/components/ContactsView";
import AuthScreen from "@/components/AuthScreen";
import ProfileMenu from "@/components/ProfileMenu";
import AdminUsers from "@/components/AdminUsers";
import AuditLogView from "@/components/AuditLogView";
import IdleTimeout from "@/components/IdleTimeout";
import { MobileLeadView } from "@/components/MobileRecordView";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const RED_MID = "#991b1b";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

function Badge({score}){
  const c = score>=7 ? RED : score>=4 ? "#e5e5e5" : MUTED;
  const bg = score>=7 ? RED_DARK : score>=4 ? "#1c1c1c" : "#171717";
  const border = score>=7 ? `${RED}44` : "#333";
  return <span style={{display:"inline-flex",alignItems:"center",background:bg,color:c,fontWeight:700,fontSize:13,padding:"3px 10px",borderRadius:6,fontFamily:"'JetBrains Mono',monospace",border:`1.5px solid ${border}`}}>{score}/10</span>;
}
function Tag({children,bg,fg}){return<span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",padding:"2px 8px",borderRadius:4,background:bg,color:fg,whiteSpace:"nowrap"}}>{children}</span>}
function NewBadge(){return<span className="badge-new" style={{display:"inline-flex",alignItems:"center",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,background:RED_DARK,color:RED,border:`1px solid ${RED}55`,whiteSpace:"nowrap"}}>NEW</span>}
function StreetView({ address, city }) {
  const [show, setShow] = useState(false);
  const cleanAddr = (address || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*—.*$/, "").replace(/,\s*San Jose$/i, "").trim();
  const fullAddr = `${cleanAddr}, ${city || "Los Gatos"}, CA`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(fullAddr)}&z=18&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
  return (
    <div style={{ marginBottom: 10 }}>
      <div onClick={() => setShow(!show)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: MUTED, marginBottom: show ? 6 : 0 }}>
        <span style={{ transform: show ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
        <span style={{ fontWeight: 600 }}>Map View</span>
        {!show && <span style={{ color: DIM, fontWeight: 400 }}>— click to load</span>}
      </div>
      {show && (
        <div className="apex-streetview" style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${BORDER}`, position: "relative" }}>
          <iframe src={embedUrl} width="100%" height="220" style={{ border: 0, display: "block" }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", top: 6, right: 6, fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(0,0,0,0.7)", color: "#fff", textDecoration: "none" }}>Open in Maps</a>
        </div>
      )}
    </div>
  );
}

function OverdueBadge(){return<span className="badge-new" style={{display:"inline-flex",alignItems:"center",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,background:"#431407",color:"#fb923c",border:"1px solid #fb923c55",whiteSpace:"nowrap"}}>OVERDUE</span>}
function SoonBadge(){return<span style={{display:"inline-flex",alignItems:"center",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,background:"#422006",color:"#fbbf24",border:"1px solid #fbbf2433",whiteSpace:"nowrap"}}>FOLLOW UP</span>}

const FORM_CITIES = ["Los Gatos", "Saratoga", "San Jose", "Sunnyvale", "Cupertino", "Mountain View", "Woodside", "Atherton", "Los Altos", "Los Altos Hills", "Palo Alto", "Milpitas", "Morgan Hill", "Campbell", "Other"];
const FORM_CATEGORIES = ["New Construction", "Addition", "Subdivision"];
const FORM_TEAM = ["Daniel", "Aron", "Joseph"];

function AddLeadForm({ onAdd }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ address: "", city: "San Jose", neighborhood: "", category: "New Construction", scope: "Custom Home", description: "", zoning: "", apn: "", dateFiled: new Date().toISOString().split("T")[0], planner: "", appType: "", existingSF: "", proposedSF: "", addedBy: FORM_TEAM[0] });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...form, existingSF: form.existingSF ? Number(form.existingSF) : null, proposedSF: form.proposedSF ? Number(form.proposedSF) : null }),
      });
      const data = await res.json();
      if (data.ok) onAdd(data.lead);
    } catch {}
    setSaving(false);
  };

  const iS = { padding: "8px 10px", borderRadius: 5, border: "1px solid #262626", background: "#111", color: "#e5e5e5", fontSize: 13, outline: "none", width: "100%" };
  const label = { fontSize: 11, color: "#737373", marginBottom: 3, fontWeight: 600 };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 40px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Add Lead Manually</div>
      <div style={{ background: "#141414", borderRadius: 8, border: "1px solid #262626", padding: 16 }}>
        <div className="apex-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Address *</div>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main Street" style={iS} />
          </div>
          <div>
            <div style={label}>City *</div>
            <select value={form.city} onChange={e => set("city", e.target.value)} style={iS}>{FORM_CITIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <div style={label}>Neighborhood</div>
            <input value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} placeholder="e.g. Willow Glen" style={iS} />
          </div>
          <div>
            <div style={label}>Category</div>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={iS}>{FORM_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <div style={label}>Scope</div>
            <input value={form.scope} onChange={e => set("scope", e.target.value)} placeholder="e.g. Custom Home (Demo/Rebuild)" style={iS} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={label}>Description</div>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Project details, source, context..." rows={3} style={{ ...iS, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={label}>Existing SF</div>
            <input type="number" value={form.existingSF} onChange={e => set("existingSF", e.target.value)} placeholder="0 for vacant" style={iS} />
          </div>
          <div>
            <div style={label}>Proposed SF</div>
            <input type="number" value={form.proposedSF} onChange={e => set("proposedSF", e.target.value)} placeholder="e.g. 3500" style={iS} />
          </div>
          <div>
            <div style={label}>Zoning</div>
            <input value={form.zoning} onChange={e => set("zoning", e.target.value)} placeholder="e.g. R-1" style={iS} />
          </div>
          <div>
            <div style={label}>APN</div>
            <input value={form.apn} onChange={e => set("apn", e.target.value)} placeholder="e.g. 527-29-031" style={iS} />
          </div>
          <div>
            <div style={label}>Date Filed</div>
            <input type="date" value={form.dateFiled} onChange={e => set("dateFiled", e.target.value)} style={iS} />
          </div>
          <div>
            <div style={label}>App Type</div>
            <input value={form.appType} onChange={e => set("appType", e.target.value)} placeholder="e.g. Building Permit" style={iS} />
          </div>
          <div>
            <div style={label}>Planner / Source</div>
            <input value={form.planner} onChange={e => set("planner", e.target.value)} placeholder="e.g. Referral from architect" style={iS} />
          </div>
          <div>
            <div style={label}>Added By</div>
            <select value={form.addedBy} onChange={e => set("addedBy", e.target.value)} style={iS}>{FORM_TEAM.map(t => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={submit} disabled={!form.address.trim() || saving} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: form.address.trim() ? "#dc2626" : "#1c1c1c", color: "#fff", fontSize: 13, fontWeight: 600, cursor: form.address.trim() ? "pointer" : "default", opacity: form.address.trim() ? 1 : 0.4 }}>
            {saving ? "Saving..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

function exportCSV(leads, crmData, getLeadId) {
  const headers = ["Address","City","Neighborhood","Category","Scope","Score","Pipeline Status","Assigned To","Contact Name","Contact Role","Contact Phone","Contact Email","Est. Value","Follow-Up Date","Last Contact By","Last Contact Date","Zoning","APN","Date Filed","Permit Status","Planner","Notes"];
  const esc = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = leads.map(p => {
    const crm = crmData[getLeadId(p)] || {};
    const notes = (crm.notes || []).map(n => `[${n.author} ${new Date(n.timestamp).toLocaleDateString()}] ${n.text}`).join(" | ");
    return [p.address, p.city||"Los Gatos", p.neighborhood||"", p.category, p.scope, p.score, crm.status||"New", crm.assignee||"", crm.contactName||"", crm.contactRole||"", crm.contactPhone||"", crm.contactEmail||"", crm.estValue||"", crm.followUpDate||"", crm.lastContactBy||"", crm.lastContactAt?new Date(crm.lastContactAt).toLocaleDateString():"", p.zoning||"", p.apn||"", p.dateFiled||"", p.status||"", p.planner||"", notes].map(esc).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apex-leads-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  // Log the export
  fetch("/api/audit/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "csv_export", targetType: "leads", details: `Exported ${rows.length} leads to CSV` }) }).catch(() => {});
}

function AuthWrapper({ children, onUser, loggedOut }) {
  const [authUser, setAuthUser] = useState(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/me?_t=${Date.now()}`).then(r => r.json()).then(d => {
      const user = d.user || null;
      setAuthUser(user);
      onUser(user);
    }).catch(() => { setAuthUser(null); onUser(null); }).finally(() => setAuthChecked(true));
  }, []);

  // React to logout from ProfileMenu
  useEffect(() => {
    if (loggedOut) setAuthUser(null);
  }, [loggedOut]);

  if (!authChecked) return <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/apex-logo-full.jpg" alt="Apex" style={{ height: 48, borderRadius: 8, opacity: 0.5 }} /></div>;
  if (!authUser) return <AuthScreen onLogin={(user) => { setAuthUser(user); onUser(user); }} />;
  return children;
}

export default function App({ projects: PROJECTS, scrapedAt }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [view, setView] = useState("leads");
  const [mobileActionLead, setMobileActionLead] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileTab, setMobileTab] = useState("leads");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leadsMode, setLeadsMode] = useState("my"); // "my" or "all"
  const [assigneeFilter, setAssigneeFilter] = useState("All"); // for "all" mode filtering
  const [expandedId, setExpandedId] = useState(null);
  const [minScore, setMinScore] = useState(0);
  const [hoodFilter, setHoodFilter] = useState("All");
  const [pipelineFilter, setPipelineFilter] = useState("All");
  const [crmData, setCrmData] = useState({});
  const [manualLeads, setManualLeads] = useState([]);

  // Load CRM data and manual leads on mount
  useEffect(() => {
    fetch(`/api/leads?_t=${Date.now()}`).then(r => r.json()).then(d => setCrmData(d.leads || {})).catch(() => {});
    fetch(`/api/leads/manual?_t=${Date.now()}`).then(r => r.json()).then(d => setManualLeads(d.leads || [])).catch(() => {});
  }, []);

  // Generate lead ID consistently
  const getLeadId = useCallback((p) =>
    btoa(encodeURIComponent(p.address + "|" + (p.appNumber || p.scope))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)
  , []);

  // Called by CRMPanel when data changes
  const handleCRMUpdate = useCallback((leadId, leadData) => {
    setCrmData(prev => ({ ...prev, [leadId]: leadData }));
  }, []);

  const allProjects = useMemo(() => [...PROJECTS, ...manualLeads], [manualLeads]);
  const scored = useMemo(() => allProjects.map(p => {
    const isNew = scrapedAt ? p.firstSeen === scrapedAt : (p.dateFiled && (Date.now() - new Date(p.dateFiled)) < 7 * 24 * 60 * 60 * 1000);
    const lid = getLeadId(p);
    const crm = crmData[lid];
    const followUp = crm?.followUpDate || "";
    const isOverdue = followUp && new Date(followUp) < new Date(new Date().toDateString());
    const followUpSoon = followUp && !isOverdue && (new Date(followUp) - new Date(new Date().toDateString())) <= 2 * 24 * 60 * 60 * 1000;
    return { ...p, ...getLeadScore(p), isNew, _leadId: lid, _crmStatus: crm?.status || "New", _crmAssignee: crm?.assignee || "", _crmFollowUp: followUp, _overdue: isOverdue, _followUpSoon: followUpSoon };
  }), [allProjects, crmData, getLeadId]);
  const categories = ["All", ...new Set(PROJECTS.map(p => p.category))];
  const cities = ["All", ...new Set(PROJECTS.map(p => p.city || "Los Gatos"))];
  const neighborhoods = useMemo(() => {
    const relevant = scored.filter(p => cityFilter === "All" || (p.city || "Los Gatos") === cityFilter);
    const hoods = [...new Set(relevant.map(p => p.neighborhood).filter(Boolean))].sort();
    return hoods.length > 0 ? ["All", ...hoods] : [];
  }, [scored, cityFilter]);
  const PIPELINE_STAGES = ["All", "New", "Contacted", "Meeting Set", "Proposal Sent", "Won", "Lost"];
  const isLeadsView = view === "leads";
  const isArchiveView = view === "archived";
  const viewAssignee = null; // legacy — now handled by leadsMode + assigneeFilter

  const archiveCount = useMemo(() => scored.filter(p => p._crmStatus === "Archived").length, [scored]);

  // Count active filters for mobile badge
  const activeFilterCount = [cityFilter !== "All", hoodFilter !== "All", catFilter !== "All", pipelineFilter !== "All", minScore > 0, sortBy !== "score", leadsMode === "all" && assigneeFilter !== "All"].filter(Boolean).length;
  const clearAllFilters = () => { setCityFilter("All"); setHoodFilter("All"); setCatFilter("All"); setPipelineFilter("All"); setMinScore(0); setSortBy("score"); setSearch(""); setAssigneeFilter("All"); };

  // Mobile tab → view sync
  const setMobileView = (tab) => {
    setMobileTab(tab);
    if (tab === "leads") setView("leads");
    else if (tab === "contacts") setView("architects");
    else if (tab === "activity") setView("activity");
    else if (tab === "dashboard") setView("dashboard");
  };

  // Pull to refresh
  const pullRefresh = async () => {
    setRefreshing(true);
    try {
      const [leadsRes, manualRes] = await Promise.all([
        fetch(`/api/leads?_t=${Date.now()}`).then(r => r.json()),
        fetch(`/api/leads/manual?_t=${Date.now()}`).then(r => r.json()),
      ]);
      if (leadsRes.leads) setCrmData(leadsRes.leads);
      if (manualRes.leads) setManualLeads(manualRes.leads);
    } catch {}
    setRefreshing(false);
  };

  const [confirmDialog, setConfirmDialog] = useState(null);

  const doArchiveLead = useCallback(async (leadId) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action: "updateStatus", status: "Archived" }),
      });
      const data = await res.json();
      if (data.lead) setCrmData(prev => ({ ...prev, [leadId]: data.lead }));
    } catch {}
  }, []);

  const archiveLead = useCallback((leadId) => {
    const lead = scored.find(p => p._leadId === leadId);
    setConfirmDialog({
      message: `Archive "${lead?.address || "this lead"}"? It will move to the Archived tab.`,
      onConfirm: () => { doArchiveLead(leadId); setConfirmDialog(null); },
    });
  }, [scored, doArchiveLead]);

  const filtered = useMemo(() => {
    let list = scored;
    if (isArchiveView) {
      list = list.filter(p => p._crmStatus === "Archived");
    } else if (isLeadsView) {
      list = list.filter(p => p._crmStatus !== "Archived");
      if (leadsMode === "my" && currentUser?.name) {
        list = list.filter(p => p._crmAssignee === currentUser.name);
      } else if (leadsMode === "all" && assigneeFilter !== "All") {
        if (assigneeFilter === "Unassigned") {
          list = list.filter(p => !p._crmAssignee);
        } else {
          list = list.filter(p => p._crmAssignee === assigneeFilter);
        }
      }
    }
    if (cityFilter !== "All") list = list.filter(p => (p.city || "Los Gatos") === cityFilter);
    if (hoodFilter !== "All") list = list.filter(p => p.neighborhood === hoodFilter);
    if (catFilter !== "All") list = list.filter(p => p.category === catFilter);
    if (pipelineFilter !== "All") list = list.filter(p => p._crmStatus === pipelineFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.address.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)||p.scope.toLowerCase().includes(q)||p.planner.toLowerCase().includes(q)||p.zoning.toLowerCase().includes(q)||p.apn.toLowerCase().includes(q)||p.overview.toLowerCase().includes(q)); }
    if (minScore > 0) list = list.filter(p => p.score >= minScore);
    list.sort((a,b) => { if (sortBy==="score") return b.score-a.score; if (sortBy==="date") return new Date(b.dateFiled)-new Date(a.dateFiled); return a.address.localeCompare(b.address); });
    return list;
  }, [scored, catFilter, cityFilter, hoodFilter, pipelineFilter, search, sortBy, minScore, isLeadsView, isArchiveView, leadsMode, assigneeFilter, currentUser]);
  const overdueAll = useMemo(() => scored.filter(p => p._overdue).length, [scored]);
  const stats = useMemo(() => ({ total:filtered.length, newLeads:filtered.filter(p=>p.isNew).length, hot:filtered.filter(p=>p.score>=7).length, overdue:filtered.filter(p=>p._overdue).length, nc:filtered.filter(p=>p.category==="New Construction").length, add:filtered.filter(p=>p.category==="Addition").length, sub:filtered.filter(p=>p.category==="Subdivision").length }), [filtered]);

  // Build lead ID → address lookup
  const leadIdToAddress = useMemo(() => {
    const map = {};
    for (const p of scored) map[p._leadId] = p.address;
    return map;
  }, [scored]);

  // Build activity feed from all CRM notes
  const activityFeed = useMemo(() => {
    const items = [];
    for (const [leadId, entry] of Object.entries(crmData)) {
      const addr = leadIdToAddress[leadId] || "Unknown Lead";
      if (entry.notes) {
        for (const note of entry.notes) {
          items.push({ type: "note", author: note.author, text: note.text, timestamp: note.timestamp, address: addr, leadId });
        }
      }
      if (entry.status && entry.status !== "New" && entry.updatedAt) {
        items.push({ type: "status", author: entry.lastContactBy || entry.assignee || "—", text: `Status → ${entry.status}`, timestamp: entry.updatedAt, address: addr, leadId });
      }
    }
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return items;
  }, [crmData, leadIdToAddress]);
  // Dashboard metrics
  const dashboard = useMemo(() => {
    const byStage = {};
    const byAssignee = {};
    const byCity = {};
    const bySource = {};
    let totalValue = 0, wonCount = 0, lostCount = 0, wonValue = 0;

    for (const p of scored) {
      const crm = crmData[p._leadId] || {};
      const stage = crm.status || "New";
      const assignee = crm.assignee || "Unassigned";
      const city = p.city || "Los Gatos";
      const source = crm.leadSource || "Unknown";
      const val = Number(crm.estValue) || 0;

      byStage[stage] = (byStage[stage] || 0) + 1;
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
      byCity[city] = (byCity[city] || 0) + 1;
      bySource[source] = (bySource[source] || 0) + 1;

      if (val > 0) totalValue += val;
      if (stage === "Won") { wonCount++; wonValue += val; }
      if (stage === "Lost") lostCount++;
    }

    const decided = wonCount + lostCount;
    const winRate = decided > 0 ? Math.round((wonCount / decided) * 100) : 0;
    const avgDeal = wonCount > 0 ? Math.round(wonValue / wonCount) : 0;

    return { byStage, byAssignee, byCity, bySource, totalValue, wonCount, lostCount, winRate, avgDeal, total: scored.length };
  }, [scored, crmData]);

  const iS = {padding:"8px 12px",borderRadius:6,border:`1px solid ${BORDER}`,background:"#111",color:TEXT,fontSize:13,outline:"none"};
  const catC = {"New Construction":{bg:RED_DARK,fg:RED},Addition:{bg:"#1c1c1c",fg:"#d4d4d4"},Subdivision:{bg:"#1c1c1c",fg:MUTED}};

  return (
    <AuthWrapper onUser={(u) => { setCurrentUser(u); if (u) setLoggedOut(false); }} loggedOut={loggedOut}>
    <IdleTimeout onLogout={() => { setCurrentUser(null); setLoggedOut(true); }} />
    {mobileActionLead && <MobileLeadView lead={mobileActionLead} leadId={mobileActionLead._leadId} currentUser={currentUser} onUpdate={handleCRMUpdate} onClose={() => setMobileActionLead(null)} />}
    {confirmDialog && (
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#141414",border:"1px solid #262626",borderRadius:10,padding:"24px 28px",maxWidth:400,width:"90%",textAlign:"center"}}>
          <div style={{fontSize:14,color:"#e5e5e5",marginBottom:16,lineHeight:1.5}}>{confirmDialog.message}</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={confirmDialog.onConfirm} style={{padding:"8px 20px",borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Confirm</button>
            <button onClick={()=>setConfirmDialog(null)} style={{padding:"8px 20px",borderRadius:6,border:"1px solid #262626",background:"transparent",color:"#737373",fontSize:13,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      </div>
    )}
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:BG,minHeight:"100vh",color:TEXT,paddingBottom:isMobile?60:0}}>

      {/* Mobile "More" menu */}
      {isMobile && showMoreMenu && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9997,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowMoreMenu(false)}>
          <div style={{background:CARD,width:"100%",maxWidth:500,borderRadius:"16px 16px 0 0",padding:"10px 0 20px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"center",padding:"6px 0 10px"}}><div style={{width:40,height:4,borderRadius:2,background:DIM}}/></div>
            {[
              {id:"addLead",label:"+ Add Lead",color:RED},
              {id:"archived",label:`Archived (${archiveCount})`,color:MUTED},
              {label:"Export CSV",color:MUTED,action:()=>{exportCSV(filtered,crmData,getLeadId);setShowMoreMenu(false)}},
              {id:"admin",label:"Admin Users",color:MUTED},
              {id:"auditLog",label:"Audit Log",color:MUTED},
            ].map((item,i)=>(
              <button key={i} onClick={()=>{if(item.action){item.action()}else{setView(item.id);setShowMoreMenu(false)}}} style={{display:"block",width:"100%",padding:"14px 24px",background:"transparent",border:"none",color:item.color,fontSize:16,fontWeight:500,cursor:"pointer",textAlign:"left"}}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"linear-gradient(145deg,#0f0f0f,#141414,#0f0f0f)",borderBottom:`1px solid ${BORDER}`,padding:isMobile?"12px 16px 10px":"20px 20px 16px"}}>
        <div style={{maxWidth:980,margin:"0 auto"}}>
          <div className="apex-header-row" style={{display:"flex",alignItems:"center",gap:isMobile?10:14,position:"relative"}}>
            <img src="/apex-logo-full.jpg" alt="Apex Design Build" style={{height:isMobile?36:48,borderRadius:6,flexShrink:0}} />
            <div className="apex-header-title" style={{borderLeft:`2px solid ${RED}`,paddingLeft:isMobile?10:14,flex:1}}>
              <h1 style={{margin:0,fontSize:isMobile?16:20,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>Construction Leads</h1>
              <p style={{margin:0,fontSize:11,color:MUTED}}>{allProjects.length} projects{scrapedAt && ` · ${new Date(scrapedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`}</p>
            </div>
            <div className="apex-bell-wrap" style={{display:"flex",gap:8,alignItems:"center"}}>
              <NotificationBell scored={scored} crmData={crmData} activityFeed={activityFeed} currentUser={currentUser?.name || ""} />
              {currentUser && <ProfileMenu user={currentUser} onLogout={() => { setCurrentUser(null); setLoggedOut(true); }} onAdminClick={() => setView("admin")} onAuditClick={() => setView("auditLog")} />}
            </div>
          </div>

          {/* Mobile: compact stats strip */}
          {isMobile && (isLeadsView || isArchiveView || view === "dashboard") && (
            <div style={{display:"flex",gap:14,marginTop:10,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
              {[
                {l:"Total",v:stats.total,c:MUTED},
                {l:"New",v:stats.newLeads,c:RED,pulse:true},
                {l:"Overdue",v:overdueAll,c:"#fb923c",pulse:true},
                {l:"Hot",v:stats.hot,c:"#fff"},
              ].map(s=><div key={s.l} style={{display:"flex",alignItems:"baseline",gap:4,flexShrink:0}}><span className={s.pulse&&s.v>0?"badge-new":""} style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</span><span style={{fontSize:10,color:MUTED}}>{s.l}</span></div>)}
            </div>
          )}

          {/* Desktop: full stats + nav tabs */}
          {!isMobile && <>
            <div className="apex-stats" style={{display:"flex",gap:18,marginTop:14,flexWrap:"wrap"}}>
              {[
                {l:"Projects",v:stats.total,c:MUTED},
                {l:"New",v:stats.newLeads,c:RED,pulse:true},
                {l:"Overdue",v:overdueAll,c:"#fb923c",pulse:true},
                {l:"Hot (7+)",v:stats.hot,c:"#fff"},
                {l:"New Const.",v:stats.nc,c:TEXT},
                {l:"Additions",v:stats.add,c:MUTED},
                {l:"Subdivisions",v:stats.sub,c:DIM},
              ].map(s=><div key={s.l} style={{display:"flex",alignItems:"baseline",gap:5}}><span className={s.pulse&&s.v>0?"badge-new":""} style={{fontSize:21,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</span><span style={{fontSize:11,color:MUTED}}>{s.l}</span></div>)}
            </div>
            <div className="apex-tabs" style={{display:"flex",gap:4,marginTop:14,alignItems:"center",flexWrap:"wrap"}}>
              {/* My Leads / All Leads toggle */}
              <div style={{display:"flex",gap:0,borderRadius:5,overflow:"hidden",border:`1px solid ${BORDER}`}}>
                <button onClick={()=>{setView("leads");setLeadsMode("my")}} style={{padding:"5px 16px",border:"none",background:view==="leads"&&leadsMode==="my"?RED_DARK:CARD,color:view==="leads"&&leadsMode==="my"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>My Leads</button>
                <button onClick={()=>{setView("leads");setLeadsMode("all")}} style={{padding:"5px 16px",border:"none",borderLeft:`1px solid ${BORDER}`,background:view==="leads"&&leadsMode==="all"?RED_DARK:CARD,color:view==="leads"&&leadsMode==="all"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>All Leads</button>
              </div>
              {/* Assignee filter — only shown in All Leads mode */}
              {view==="leads"&&leadsMode==="all"&&(
                <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${BORDER}`,background:CARD,color:assigneeFilter!=="All"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  <option value="All">All Team</option>
                  <option value="Unassigned">Unassigned</option>
                  {FORM_TEAM.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {[
                {id:"dashboard",label:"Dashboard"},
                {id:"architects",label:"Architects"},
                {id:"designers",label:"Designers"},
                {id:"realtors",label:"Realtors"},
                {id:"activity",label:`Activity${activityFeed.length>0?` (${activityFeed.length})`:""}`},
                {id:"addLead",label:"+ Add Lead"},
                {id:"archived",label:`Archived${archiveCount>0?` (${archiveCount})`:""}`},
              ].map(t=>(
                <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"5px 16px",borderRadius:5,border:`1px solid ${view===t.id?RED:BORDER}`,background:view===t.id?RED_DARK:CARD,color:view===t.id?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{t.label}</button>
              ))}
              <button onClick={()=>exportCSV(filtered,crmData,getLeadId)} style={{marginLeft:"auto",padding:"5px 14px",borderRadius:5,border:`1px solid ${BORDER}`,background:CARD,color:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>Export CSV</button>
            </div>
          </>}
        </div>
      </div>

      {/* Mobile: pull to refresh indicator */}
      {isMobile && refreshing && (
        <div style={{textAlign:"center",padding:"8px 0",color:MUTED,fontSize:12,background:CARD,borderBottom:`1px solid ${BORDER}`}}>Refreshing...</div>
      )}

      {/* Mobile: My Leads / All Leads toggle on Leads tab */}
      {isMobile && isLeadsView && (
        <div style={{padding:"8px 16px",display:"flex",gap:6,alignItems:"center",background:BG,borderBottom:`1px solid ${BORDER}`}}>
          <div style={{display:"flex",gap:0,borderRadius:20,overflow:"hidden",border:`1px solid ${BORDER}`,flexShrink:0}}>
            <button onClick={()=>setLeadsMode("my")} style={{padding:"7px 16px",border:"none",background:leadsMode==="my"?RED_DARK:BG,color:leadsMode==="my"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>My Leads</button>
            <button onClick={()=>setLeadsMode("all")} style={{padding:"7px 16px",border:"none",borderLeft:`1px solid ${BORDER}`,background:leadsMode==="all"?RED_DARK:BG,color:leadsMode==="all"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>All Leads</button>
          </div>
          {leadsMode==="all"&&(
            <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{padding:"6px 10px",borderRadius:20,border:`1.5px solid ${assigneeFilter!=="All"?RED:BORDER}`,background:assigneeFilter!=="All"?RED_DARK:BG,color:assigneeFilter!=="All"?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}}>
              <option value="All">All Team</option>
              <option value="Unassigned">Unassigned</option>
              {FORM_TEAM.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button onClick={pullRefresh} disabled={refreshing} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:20,border:`1.5px solid ${BORDER}`,background:BG,color:MUTED,fontSize:12,cursor:"pointer",flexShrink:0}}>
            {refreshing ? "..." : "↻"}
          </button>
        </div>
      )}

      {/* Mobile: contacts sub-tabs */}
      {isMobile && mobileTab === "contacts" && (
        <div style={{padding:"8px 16px",display:"flex",gap:6,background:BG,borderBottom:`1px solid ${BORDER}`}}>
          {[
            {id:"architects",label:"Architects"},
            {id:"designers",label:"Designers"},
            {id:"realtors",label:"Realtors"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"8px 0",borderRadius:20,border:`1.5px solid ${view===t.id?RED:BORDER}`,background:view===t.id?RED_DARK:BG,color:view===t.id?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ACTIVITY FEED VIEW */}
      {view === "activity" && (
        <div style={{maxWidth:980,margin:"0 auto",padding:"14px 20px 40px"}}>
          <div style={{fontSize:13,fontWeight:600,color:TEXT,marginBottom:12}}>Recent Activity</div>
          {activityFeed.length === 0 && <div style={{textAlign:"center",padding:40,color:MUTED}}>No activity yet. Log notes on leads to see them here.</div>}
          {activityFeed.map((item, i) => (
            <div key={i} style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"10px 14px",marginBottom:4,display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:6,height:6,borderRadius:3,background:item.type==="note"?RED:"#60a5fa",flexShrink:0,marginTop:6}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600,color:TEXT}}>{item.author}</span>
                  <span style={{fontSize:10,color:DIM}}>
                    {new Date(item.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"})} {new Date(item.timestamp).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
                  </span>
                  <span style={{fontSize:11,color:MUTED,marginLeft:"auto",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:250}}>{item.address}</span>
                </div>
                <div style={{fontSize:12,color:item.type==="note"?"#d4d4d4":"#60a5fa",marginTop:3,lineHeight:1.4}}>{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {view === "dashboard" && (
        <div style={{maxWidth:980,margin:"0 auto",padding:"14px 20px 40px"}}>
          {/* Top metrics */}
          <div className="apex-metrics-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:16}}>
            {[
              {label:"Total Leads",value:dashboard.total,color:TEXT},
              {label:"Pipeline Value",value:`$${dashboard.totalValue.toLocaleString()}`,color:"#fff"},
              {label:"Win Rate",value:`${dashboard.winRate}%`,color:dashboard.winRate>0?"#4ade80":MUTED},
              {label:"Won",value:dashboard.wonCount,color:"#4ade80"},
              {label:"Lost",value:dashboard.lostCount,color:"#525252"},
              {label:"Avg Deal",value:dashboard.avgDeal>0?`$${dashboard.avgDeal.toLocaleString()}`:"—",color:TEXT},
            ].map(m=>(
              <div key={m.label} style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,fontWeight:600}}>{m.label}</div>
                <div style={{fontSize:22,fontWeight:700,color:m.color,fontFamily:"'JetBrains Mono',monospace"}}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Breakdowns */}
          <div className="apex-dashboard-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* By Pipeline Stage */}
            <div style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"14px"}}>
              <div style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:600}}>By Pipeline Stage</div>
              {["New","Contacted","Meeting Set","Proposal Sent","Won","Lost"].map(stage=>{
                const count = dashboard.byStage[stage]||0;
                const pct = dashboard.total>0?Math.round((count/dashboard.total)*100):0;
                const barColor = stage==="Won"?"#4ade80":stage==="Lost"?"#525252":stage==="New"?MUTED:RED;
                return <div key={stage} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:TEXT}}>{stage}</span>
                    <span style={{color:MUTED,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"#1c1c1c"}}>
                    <div style={{height:4,borderRadius:2,background:barColor,width:`${pct}%`,transition:"width 0.3s"}} />
                  </div>
                </div>;
              })}
            </div>

            {/* By Team Member */}
            <div style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"14px"}}>
              <div style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:600}}>By Team Member</div>
              {Object.entries(dashboard.byAssignee).sort((a,b)=>b[1]-a[1]).map(([name,count])=>{
                const pct = dashboard.total>0?Math.round((count/dashboard.total)*100):0;
                return <div key={name} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:TEXT}}>{name}</span>
                    <span style={{color:MUTED,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"#1c1c1c"}}>
                    <div style={{height:4,borderRadius:2,background:RED,width:`${pct}%`,transition:"width 0.3s"}} />
                  </div>
                </div>;
              })}
            </div>

            {/* By City */}
            <div style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"14px"}}>
              <div style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:600}}>By City</div>
              {Object.entries(dashboard.byCity).sort((a,b)=>b[1]-a[1]).map(([city,count])=>{
                const pct = dashboard.total>0?Math.round((count/dashboard.total)*100):0;
                return <div key={city} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:TEXT}}>{city}</span>
                    <span style={{color:MUTED,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"#1c1c1c"}}>
                    <div style={{height:4,borderRadius:2,background:"#fff",width:`${pct}%`,transition:"width 0.3s"}} />
                  </div>
                </div>;
              })}
            </div>

            {/* By Source */}
            <div style={{background:CARD,borderRadius:6,border:`1px solid ${BORDER}`,padding:"14px"}}>
              <div style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10,fontWeight:600}}>By Lead Source</div>
              {Object.entries(dashboard.bySource).sort((a,b)=>b[1]-a[1]).map(([source,count])=>{
                const pct = dashboard.total>0?Math.round((count/dashboard.total)*100):0;
                return <div key={source} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                    <span style={{color:TEXT}}>{source}</span>
                    <span style={{color:MUTED,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"#1c1c1c"}}>
                    <div style={{height:4,borderRadius:2,background:"#fbbf24",width:`${pct}%`,transition:"width 0.3s"}} />
                  </div>
                </div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* ARCHITECTS VIEW */}
      {view === "architects" && <ContactsView role="Architect" apiPath="/api/architects" crmData={crmData} scored={scored} currentUser={currentUser} />}
      {view === "designers" && <ContactsView role="Designer" apiPath="/api/designers" crmData={crmData} scored={scored} currentUser={currentUser} />}
      {view === "realtors" && <ContactsView role="Realtor" apiPath="/api/realtors" crmData={crmData} scored={scored} currentUser={currentUser} />}

      {/* ADD LEAD FORM */}
      {view === "addLead" && <AddLeadForm onAdd={(lead) => { setManualLeads(prev => [...prev, lead]); setView("leads"); }} />}

      {/* FILTERS + CARDS */}
      {(isLeadsView || isArchiveView) && <>

      {/* Mobile search modal */}
      {isMobile && showMobileSearch && (
        <div style={{position:"fixed",inset:0,background:BG,zIndex:9997,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px",display:"flex",gap:10,alignItems:"center",borderBottom:`1px solid ${BORDER}`}}>
            <button onClick={()=>setShowMobileSearch(false)} style={{background:"none",border:"none",color:MUTED,fontSize:18,cursor:"pointer",padding:"4px"}}>←</button>
            <input type="text" placeholder="Search address, APN, planner..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus style={{...iS,flex:1,fontSize:16,padding:"12px 14px"}} />
            {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:DIM,fontSize:14,cursor:"pointer"}}>✕</button>}
          </div>
          <div style={{padding:"10px 16px",display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>{setShowMobileSearch(false);setShowMobileFilters(true)}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:8,border:`1px solid ${activeFilterCount>0?RED:BORDER}`,background:activeFilterCount>0?RED_DARK:CARD,color:activeFilterCount>0?RED:MUTED,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              ⚙ Filters{activeFilterCount>0?` (${activeFilterCount})`:""}
            </button>
            {activeFilterCount>0 && <button onClick={clearAllFilters} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${BORDER}`,background:CARD,color:MUTED,fontSize:13,cursor:"pointer"}}>Clear All</button>}
            <span style={{marginLeft:"auto",fontSize:13,color:MUTED}}>{filtered.length} results</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"0 16px 20px"}}>
            {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED}}>No matches</div>}
            {filtered.slice(0,20).map((p)=>{const cc=catC[p.category]||{bg:"#1c1c1c",fg:MUTED};return(
              <div key={p.address+p.appNumber} onClick={()=>{setShowMobileSearch(false);setMobileActionLead(p)}} style={{background:CARD,borderRadius:8,border:`1px solid ${p.score>=7?RED_MID:BORDER}`,marginBottom:6,padding:"12px 14px",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{display:"inline-flex",alignItems:"center",background:p.score>=7?RED_DARK:p.score>=4?"#1c1c1c":"#171717",color:p.score>=7?RED:p.score>=4?TEXT:MUTED,fontWeight:700,fontSize:13,padding:"3px 8px",borderRadius:5,fontFamily:"'JetBrains Mono',monospace"}}>{p.score}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
                    <div style={{fontSize:12,color:MUTED,marginTop:2}}>{p.scope} · {p.city||"Los Gatos"}</div>
                  </div>
                </div>
              </div>
            )})}
            {filtered.length>20&&<div style={{textAlign:"center",padding:16,color:DIM,fontSize:12}}>Showing first 20 of {filtered.length} results. Refine your search.</div>}
          </div>
        </div>
      )}

      {/* Mobile filter modal */}
      {isMobile && showMobileFilters && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9997,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)setShowMobileFilters(false)}}>
          <div style={{background:CARD,width:"100%",maxWidth:500,borderRadius:"16px 16px 0 0",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"center",padding:"10px 0 6px"}}><div style={{width:40,height:4,borderRadius:2,background:DIM}}/></div>
            <div style={{padding:"4px 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:16,fontWeight:700,color:"#fff"}}>Filters</span>
              {activeFilterCount>0&&<button onClick={()=>{clearAllFilters()}} style={{background:"none",border:"none",color:RED,fontSize:13,fontWeight:600,cursor:"pointer"}}>Clear All</button>}
            </div>
            <div style={{padding:"0 20px 24px",display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>City</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {cities.map(c=><button key={c} onClick={()=>{setCityFilter(c);setHoodFilter("All")}} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${cityFilter===c?RED:BORDER}`,background:cityFilter===c?RED_DARK:BG,color:cityFilter===c?RED:TEXT,fontSize:13,fontWeight:cityFilter===c?700:400,cursor:"pointer"}}>{c==="All"?"All Cities":c}</button>)}
                </div>
              </div>
              {neighborhoods.length>0&&<div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Neighborhood</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {neighborhoods.map(n=><button key={n} onClick={()=>setHoodFilter(n)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${hoodFilter===n?RED:BORDER}`,background:hoodFilter===n?RED_DARK:BG,color:hoodFilter===n?RED:TEXT,fontSize:13,fontWeight:hoodFilter===n?700:400,cursor:"pointer"}}>{n==="All"?"All":n}</button>)}
                </div>
              </div>}
              <div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Category</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {categories.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${catFilter===c?RED:BORDER}`,background:catFilter===c?RED_DARK:BG,color:catFilter===c?RED:TEXT,fontSize:13,fontWeight:catFilter===c?700:400,cursor:"pointer"}}>{c}</button>)}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Pipeline Stage</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {PIPELINE_STAGES.map(s=><button key={s} onClick={()=>setPipelineFilter(s)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${pipelineFilter===s?RED:BORDER}`,background:pipelineFilter===s?RED_DARK:BG,color:pipelineFilter===s?RED:TEXT,fontSize:13,fontWeight:pipelineFilter===s?700:400,cursor:"pointer"}}>{s}</button>)}
                </div>
              </div>
              {leadsMode==="all"&&<div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Team Member</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["All","Unassigned",...FORM_TEAM].map(t=><button key={t} onClick={()=>setAssigneeFilter(t)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${assigneeFilter===t?RED:BORDER}`,background:assigneeFilter===t?RED_DARK:BG,color:assigneeFilter===t?RED:TEXT,fontSize:13,fontWeight:assigneeFilter===t?700:400,cursor:"pointer"}}>{t==="All"?"All Team":t}</button>)}
                </div>
              </div>}
              <div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Min Score</div>
                <div style={{display:"flex",gap:6}}>
                  {[{v:0,l:"Any"},{v:4,l:"4+"},{v:7,l:"7+"}].map(({v,l})=><button key={v} onClick={()=>setMinScore(v)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${minScore===v?RED:BORDER}`,background:minScore===v?RED_DARK:BG,color:minScore===v?RED:TEXT,fontSize:13,fontWeight:minScore===v?700:400,cursor:"pointer",flex:1}}>{l}</button>)}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:MUTED,fontWeight:600,marginBottom:6}}>Sort By</div>
                <div style={{display:"flex",gap:6}}>
                  {[{v:"score",l:"Lead Score"},{v:"date",l:"Newest"},{v:"address",l:"Address"}].map(({v,l})=><button key={v} onClick={()=>setSortBy(v)} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${sortBy===v?RED:BORDER}`,background:sortBy===v?RED_DARK:BG,color:sortBy===v?RED:TEXT,fontSize:13,fontWeight:sortBy===v?700:400,cursor:"pointer",flex:1}}>{l}</button>)}
                </div>
              </div>
              <button onClick={()=>setShowMobileFilters(false)} style={{width:"100%",padding:"14px 0",borderRadius:8,border:"none",background:RED,color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:4}}>
                Show {filtered.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: full inline filters | Mobile: compact search bar */}
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:isMobile?"8px 16px":"10px 20px",position:"sticky",top:0,zIndex:10}}>
        {isMobile ? (
          <div style={{maxWidth:980,margin:"0 auto",display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowMobileSearch(true)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:8,border:`1px solid ${BORDER}`,background:"#111",color:search?TEXT:MUTED,fontSize:14,cursor:"pointer",textAlign:"left"}}>
              🔍 {search||"Search leads..."}
            </button>
            <button onClick={()=>setShowMobileFilters(true)} style={{position:"relative",display:"flex",alignItems:"center",gap:4,padding:"10px 14px",borderRadius:8,border:`1px solid ${activeFilterCount>0?RED:BORDER}`,background:activeFilterCount>0?RED_DARK:CARD,color:activeFilterCount>0?RED:MUTED,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              ⚙{activeFilterCount>0&&<span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:9,background:RED,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeFilterCount}</span>}
            </button>
            <span style={{fontSize:12,color:DIM,flexShrink:0}}>{filtered.length}</span>
          </div>
        ) : (
          <div className="apex-filters" style={{maxWidth:980,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input type="text" placeholder="Search address, APN, planner, zoning, description..." value={search} onChange={e=>setSearch(e.target.value)} style={{...iS,flex:"1 1 200px",minWidth:160}} />
            <select value={cityFilter} onChange={e=>{setCityFilter(e.target.value);setHoodFilter("All")}} style={{...iS,cursor:"pointer"}}>{cities.map(c=><option key={c} value={c}>{c==="All"?"City: All":c}</option>)}</select>
            {neighborhoods.length>0&&<select value={hoodFilter} onChange={e=>setHoodFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{neighborhoods.map(n=><option key={n} value={n}>{n==="All"?"Neighborhood: All":n}</option>)}</select>}
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{categories.map(c=><option key={c}>{c}</option>)}</select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...iS,cursor:"pointer"}}><option value="score">Sort: Lead Score</option><option value="date">Sort: Newest</option><option value="address">Sort: Address</option></select>
            <select value={pipelineFilter} onChange={e=>setPipelineFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{PIPELINE_STAGES.map(s=><option key={s} value={s}>{s==="All"?"Pipeline: All":s}</option>)}</select>
            <select value={minScore} onChange={e=>setMinScore(+e.target.value)} style={{...iS,cursor:"pointer"}}><option value={0}>Min: Any</option><option value={4}>Min: 4+</option><option value={7}>Min: 7+</option></select>
          </div>
        )}
      </div>

      {/* Mobile: active filter chips */}
      {isMobile && activeFilterCount > 0 && (
        <div style={{padding:"6px 16px",display:"flex",gap:6,flexWrap:"wrap",background:BG}}>
          {cityFilter!=="All"&&<span onClick={()=>{setCityFilter("All");setHoodFilter("All")}} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{cityFilter} ✕</span>}
          {hoodFilter!=="All"&&<span onClick={()=>setHoodFilter("All")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{hoodFilter} ✕</span>}
          {catFilter!=="All"&&<span onClick={()=>setCatFilter("All")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{catFilter} ✕</span>}
          {pipelineFilter!=="All"&&<span onClick={()=>setPipelineFilter("All")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{pipelineFilter} ✕</span>}
          {minScore>0&&<span onClick={()=>setMinScore(0)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>Min {minScore}+ ✕</span>}
          {sortBy!=="score"&&<span onClick={()=>setSortBy("score")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{sortBy==="date"?"Newest":"A-Z"} ✕</span>}
          {leadsMode==="all"&&assigneeFilter!=="All"&&<span onClick={()=>setAssigneeFilter("All")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,background:RED_DARK,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>{assigneeFilter} ✕</span>}
        </div>
      )}

      {/* PROJECT CARDS */}
      <div style={{maxWidth:980,margin:"0 auto",padding:"10px 20px 40px"}}>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED}}>No projects match your filters.</div>}
        {filtered.map((p,i)=>{const open=expandedId===p._leadId;const cc=catC[p.category]||{bg:"#1c1c1c",fg:MUTED};return(
          <div key={p.address+p.appNumber} style={{background:CARD,borderRadius:8,border:`1px solid ${p._overdue?"#fb923c":p.isNew?RED:p.score>=7?RED_MID:BORDER}`,marginBottom:6,overflow:"hidden",borderLeft:p._overdue?"3px solid #fb923c":p.isNew?`3px solid ${RED}`:undefined}}>
            <div className="apex-card-header" onClick={()=>{if(isMobile){setMobileActionLead(p)}else{setExpandedId(open?null:p._leadId)}}} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flexShrink:0,paddingTop:1}}><Badge score={p.score}/></div>
              <div style={{flex:1,minWidth:0}}>
                {isMobile ? (<>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:2}}><span style={{fontWeight:700,fontSize:14,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60vw"}}>{p.address}</span>{p._overdue&&<OverdueBadge/>}{p._followUpSoon&&<SoonBadge/>}{p.isNew&&<NewBadge/>}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:MUTED}}><span>{p.city||"Los Gatos"}</span>{p._crmStatus&&p._crmStatus!=="New"&&<Tag bg={p._crmStatus==="Won"?"#052e16":p._crmStatus==="Lost"?"#1c1c1c":"#172554"} fg={p._crmStatus==="Won"?"#4ade80":p._crmStatus==="Lost"?"#525252":"#60a5fa"}>{p._crmStatus}</Tag>}{p._crmAssignee&&<span style={{color:DIM}}>{p._crmAssignee}</span>}</div>
                </>) : (<>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}><span style={{fontWeight:700,fontSize:14,color:"#fff"}}>{p.address}</span>{p._overdue&&<OverdueBadge/>}{p._followUpSoon&&<SoonBadge/>}{p.isNew&&<NewBadge/>}<Tag bg={cc.bg} fg={cc.fg}>{p.category}</Tag>{p._crmStatus && p._crmStatus!=="New"&&<Tag bg={p._crmStatus==="Won"?"#052e16":p._crmStatus==="Lost"?"#1c1c1c":"#172554"} fg={p._crmStatus==="Won"?"#4ade80":p._crmStatus==="Lost"?"#525252":"#60a5fa"}>{p._crmStatus}</Tag>}{p._crmAssignee&&<span style={{fontSize:10,color:DIM}}>{p._crmAssignee}</span>}</div>
                  <div style={{fontSize:13,color:"#d4d4d4",lineHeight:1.35,marginBottom:3}}>{p.overview}</div>
                  <div style={{fontSize:11,color:MUTED}}>{p.city || "Los Gatos"}{p.neighborhood && ` · ${p.neighborhood}`}{p.zoning && ` · ${p.zoning}`}{p.apn && p.apn !== "TBD" && ` · APN ${p.apn}`}{p.dateFiled && ` · Filed ${new Date(p.dateFiled).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`} · {p.planner}</div>
                </>)}
              </div>
              {!isMobile && <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                {!isArchiveView && p._crmStatus !== "Archived" && <button onClick={e=>{e.stopPropagation();archiveLead(p._leadId)}} title="Archive this lead" style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:DIM,padding:"2px 4px",borderRadius:3,transition:"color 0.15s"}} onMouseEnter={e=>e.target.style.color="#fb923c"} onMouseLeave={e=>e.target.style.color=DIM}>✕</button>}
                <div style={{fontSize:14,color:DIM,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</div>
              </div>}
            </div>
            {open&&(<div className="apex-card-body" style={{padding:"0 14px 14px",borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
              <CRMPanel key={p._leadId} leadId={p._leadId} onUpdate={handleCRMUpdate} leadAddress={p.address} leadScope={p.scope} />
              <StreetView address={p.address} city={p.city} />
              <p style={{margin:"0 0 10px",fontSize:13,color:MUTED,lineHeight:1.45}}>{p.description}</p>
              <div style={{background:BG,borderRadius:6,padding:"10px 12px",marginBottom:10,border:`1px solid ${BORDER}`}}>
                <div style={{fontSize:11,fontWeight:600,color:MUTED,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Square Footage</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:4}}>
                  <div><span style={{fontSize:11,color:MUTED}}>Existing: </span><span style={{fontSize:13,fontWeight:600,color:p.existingSF!==null?TEXT:DIM,fontFamily:"'JetBrains Mono',monospace"}}>{p.existingSF!==null?(p.existingSF===0?"Vacant":`${p.existingSF.toLocaleString()} SF`):"—"}</span></div>
                  <div><span style={{fontSize:11,color:MUTED}}>Proposed: </span><span style={{fontSize:13,fontWeight:600,color:p.proposedSF!==null?TEXT:DIM,fontFamily:"'JetBrains Mono',monospace"}}>{p.proposedSF!==null?`${p.proposedSF.toLocaleString()} SF`:"—"}</span></div>
                </div>
                <div style={{fontSize:11,color:MUTED,fontStyle:"italic"}}>{p.sfNote}</div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{p.reasons.map((r,ri)=><span key={ri} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:BG,color:MUTED,border:`1px solid ${BORDER}`}}>{r}</span>)}</div>
              <div style={{fontSize:12,color:MUTED,marginBottom:10}}>{p.appNumber && <><strong style={{color:TEXT}}>App #:</strong> {p.appNumber} · </>}<strong style={{color:TEXT}}>Type:</strong> {p.appType} · <strong style={{color:TEXT}}>Status:</strong> {p.status}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {p.pageUrl&&<a href={p.pageUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:RED,color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background=RED_MID} onMouseLeave={e=>e.target.style.background=RED}>View Project</a>}
                <a href={`https://www.zillow.com/homes/${encodeURIComponent((p.address||"").replace(/\s*\(.*?\)/g,"").replace(/,\s*San Jose$/i,"").trim().replace(/\s+/g,"-"))}_rb/`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:BG,color:MUTED,fontSize:11,fontWeight:500,textDecoration:"none",border:`1px solid ${BORDER}`,transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor="#006AFF";e.target.style.color="#006AFF"}} onMouseLeave={e=>{e.target.style.borderColor=BORDER;e.target.style.color=MUTED}}>Zillow</a>
                <a href={`https://www.redfin.com/search#q=${encodeURIComponent((p.address||"").replace(/\s*\(.*?\)/g,"").trim() + ", " + (p.city||"Los Gatos") + ", CA")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:BG,color:MUTED,fontSize:11,fontWeight:500,textDecoration:"none",border:`1px solid ${BORDER}`,transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor="#A02B2D";e.target.style.color="#A02B2D"}} onMouseLeave={e=>{e.target.style.borderColor=BORDER;e.target.style.color=MUTED}}>Redfin</a>
                {p.docs.map((d,di)=><a key={di} href={d.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:BG,color:MUTED,fontSize:11,fontWeight:500,textDecoration:"none",border:`1px solid ${BORDER}`,transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor=RED;e.target.style.color="#fff"}} onMouseLeave={e=>{e.target.style.borderColor=BORDER;e.target.style.color=MUTED}}>{d.name}</a>)}
              </div>
            </div>)}
          </div>)})}

        {/* FOOTER */}
        <div style={{marginTop:20,padding:14,borderRadius:8,background:CARD,border:`1px solid ${BORDER}`,fontSize:11,color:MUTED,lineHeight:1.5}}>
          <strong style={{color:TEXT}}>Lead Scoring:</strong> Priority 1: permit proximity (near approval/hearing scores highest). Priority 2: new construction ≤5 units (demo/rebuild, ground-up, custom homes). Priority 3: square footage tiebreaker for qualifying leads. Projects over 5 units or 10+ acres are penalized. <strong style={{color:TEXT}}>SF Data:</strong> Existing/Proposed SF fields are populated from plan PDFs when available.
        </div>
        <div style={{textAlign:"center",marginTop:16,paddingBottom:8}}>
          <img src="/apex-logo.webp" alt="Apex Design Build" style={{height:24,opacity:0.4}} />
        </div>
      </div>
      </>}

      {/* ADMIN VIEWS */}
      {view === "admin" && currentUser?.role === "admin" && <AdminUsers />}
      {view === "auditLog" && currentUser?.role === "admin" && <AuditLogView />}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      {isMobile && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,display:"flex",background:CARD,borderTop:`1px solid ${BORDER}`,zIndex:9996,paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
          {[
            {id:"leads",label:"Leads",icon:"📋",badge:overdueAll>0?overdueAll:null},
            {id:"contacts",label:"Contacts",icon:"👥"},
            {id:"activity",label:"Activity",icon:"⚡",badge:activityFeed.length>0?null:null},
            {id:"dashboard",label:"Dashboard",icon:"📊"},
            {id:"more",label:"More",icon:"•••"},
          ].map(t=>{
            const isActive = t.id === "more" ? false : mobileTab===t.id;
            return (
              <button key={t.id} onClick={()=>{if(t.id==="more"){setShowMoreMenu(true)}else{setMobileView(t.id)}}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0 6px",background:"transparent",border:"none",color:isActive?RED:MUTED,fontSize:10,fontWeight:isActive?700:500,cursor:"pointer",position:"relative"}}>
                <span style={{fontSize:18}}>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge&&<span style={{position:"absolute",top:4,right:"50%",transform:"translateX(12px)",width:16,height:16,borderRadius:8,background:RED,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
    </AuthWrapper>
  );
}
