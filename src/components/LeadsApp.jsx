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

function AuthWrapper({ children, onUser }) {
  const [authUser, setAuthUser] = useState(undefined);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/me?_t=${Date.now()}`).then(r => r.json()).then(d => {
      const user = d.user || null;
      setAuthUser(user);
      onUser(user);
    }).catch(() => { setAuthUser(null); onUser(null); }).finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) return <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/apex-logo-full.jpg" alt="Apex" style={{ height: 48, borderRadius: 8, opacity: 0.5 }} /></div>;
  if (!authUser) return <AuthScreen onLogin={(user) => { setAuthUser(user); onUser(user); }} />;
  return children;
}

export default function App({ projects: PROJECTS, scrapedAt }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("leads");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("score");
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
  const isLeadsView = view === "leads" || view.startsWith("leads:");
  const isArchiveView = view === "archived";
  const viewAssignee = view.startsWith("leads:") ? view.split(":")[1] : null;

  const archiveCount = useMemo(() => scored.filter(p => p._crmStatus === "Archived").length, [scored]);

  const archiveLead = useCallback(async (leadId) => {
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

  const filtered = useMemo(() => {
    let list = scored;
    if (isArchiveView) {
      list = list.filter(p => p._crmStatus === "Archived");
    } else if (isLeadsView) {
      // Always exclude archived from active views
      list = list.filter(p => p._crmStatus !== "Archived");
      if (viewAssignee) {
        list = list.filter(p => p._crmAssignee === viewAssignee);
      } else {
        list = list.filter(p => !p._crmAssignee);
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
  }, [scored, catFilter, cityFilter, hoodFilter, pipelineFilter, search, sortBy, minScore, isLeadsView, isArchiveView, viewAssignee]);
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
    <AuthWrapper onUser={setCurrentUser}>
    <IdleTimeout onLogout={() => setCurrentUser(null)} />
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:BG,minHeight:"100vh",color:TEXT}}>
      {/* HEADER */}
      <div style={{background:"linear-gradient(145deg,#0f0f0f,#141414,#0f0f0f)",borderBottom:`1px solid ${BORDER}`,padding:"20px 20px 16px"}}>
        <div style={{maxWidth:980,margin:"0 auto"}}>
          <div className="apex-header-row" style={{display:"flex",alignItems:"center",gap:14,position:"relative"}}>
            <img src="/apex-logo-full.jpg" alt="Apex Design Build" style={{height:48,borderRadius:6,flexShrink:0}} />
            <div className="apex-header-title" style={{borderLeft:`2px solid ${RED}`,paddingLeft:14,flex:1}}>
              <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>Construction Leads</h1>
              <p style={{margin:0,fontSize:12,color:MUTED}}>South Bay Construction Leads · {allProjects.length} projects{scrapedAt && ` · Updated ${new Date(scrapedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`}</p>
            </div>
            <div className="apex-bell-wrap" style={{display:"flex",gap:8,alignItems:"center"}}>
              <NotificationBell scored={scored} crmData={crmData} activityFeed={activityFeed} currentUser={currentUser?.name || ""} />
              {currentUser && <ProfileMenu user={currentUser} onLogout={() => setCurrentUser(null)} onAdminClick={() => setView("admin")} onAuditClick={() => setView("auditLog")} />}
            </div>
          </div>
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
            {[
              {id:"leads",label:"Unassigned"},
              {id:"leads:Daniel",label:"Daniel"},
              {id:"leads:Aron",label:"Aron"},
              {id:"leads:Joseph",label:"Joseph"},
              {id:"archived",label:`Archived${archiveCount>0?` (${archiveCount})`:""}`},
              {id:"dashboard",label:"Dashboard"},
              {id:"architects",label:"Architects"},
              {id:"designers",label:"Designers"},
              {id:"realtors",label:"Realtors"},
              {id:"activity",label:`Activity${activityFeed.length>0?` (${activityFeed.length})`:""}`},
              {id:"addLead",label:"+ Add Lead"},
            ].map(t=>(
              <button key={t.id} onClick={()=>setView(t.id)} style={{padding:"5px 16px",borderRadius:5,border:`1px solid ${view===t.id?RED:BORDER}`,background:view===t.id?RED_DARK:CARD,color:view===t.id?RED:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{t.label}</button>
            ))}
            <button onClick={()=>exportCSV(filtered,crmData,getLeadId)} style={{marginLeft:"auto",padding:"5px 14px",borderRadius:5,border:`1px solid ${BORDER}`,background:CARD,color:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>Export CSV</button>
          </div>
        </div>
      </div>

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
      {view === "architects" && <ContactsView role="Architect" apiPath="/api/architects" crmData={crmData} scored={scored} />}
      {view === "designers" && <ContactsView role="Designer" apiPath="/api/designers" crmData={crmData} scored={scored} />}
      {view === "realtors" && <ContactsView role="Realtor" apiPath="/api/realtors" crmData={crmData} scored={scored} />}

      {/* ADD LEAD FORM */}
      {view === "addLead" && <AddLeadForm onAdd={(lead) => { setManualLeads(prev => [...prev, lead]); setView("leads"); }} />}

      {/* FILTERS + CARDS */}
      {(isLeadsView || isArchiveView) && <>
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"10px 20px",position:"sticky",top:0,zIndex:10}}>
        <div className="apex-filters" style={{maxWidth:980,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input type="text" placeholder="Search address, APN, planner, zoning, description..." value={search} onChange={e=>setSearch(e.target.value)} style={{...iS,flex:"1 1 200px",minWidth:160}} />
          <select value={cityFilter} onChange={e=>{setCityFilter(e.target.value);setHoodFilter("All")}} style={{...iS,cursor:"pointer"}}>{cities.map(c=><option key={c} value={c}>{c==="All"?"City: All":c}</option>)}</select>
          {neighborhoods.length>0&&<select value={hoodFilter} onChange={e=>setHoodFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{neighborhoods.map(n=><option key={n} value={n}>{n==="All"?"Neighborhood: All":n}</option>)}</select>}
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...iS,cursor:"pointer"}}><option value="score">Sort: Lead Score</option><option value="date">Sort: Newest</option><option value="address">Sort: Address</option></select>
          <select value={pipelineFilter} onChange={e=>setPipelineFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{PIPELINE_STAGES.map(s=><option key={s} value={s}>{s==="All"?"Pipeline: All":s}</option>)}</select>
          <select value={minScore} onChange={e=>setMinScore(+e.target.value)} style={{...iS,cursor:"pointer"}}><option value={0}>Min: Any</option><option value={4}>Min: 4+</option><option value={7}>Min: 7+</option></select>
        </div>
      </div>

      {/* PROJECT CARDS */}
      <div style={{maxWidth:980,margin:"0 auto",padding:"10px 20px 40px"}}>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED}}>No projects match your filters.</div>}
        {filtered.map((p,i)=>{const open=expandedId===p._leadId;const cc=catC[p.category]||{bg:"#1c1c1c",fg:MUTED};return(
          <div key={p.address+p.appNumber} style={{background:CARD,borderRadius:8,border:`1px solid ${p._overdue?"#fb923c":p.isNew?RED:p.score>=7?RED_MID:BORDER}`,marginBottom:6,overflow:"hidden",borderLeft:p._overdue?"3px solid #fb923c":p.isNew?`3px solid ${RED}`:undefined}}>
            <div className="apex-card-header" onClick={()=>setExpandedId(open?null:p._leadId)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flexShrink:0,paddingTop:1}}><Badge score={p.score}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}><span style={{fontWeight:700,fontSize:14,color:"#fff"}}>{p.address}</span>{p._overdue&&<OverdueBadge/>}{p._followUpSoon&&<SoonBadge/>}{p.isNew&&<NewBadge/>}<Tag bg={cc.bg} fg={cc.fg}>{p.category}</Tag>{p._crmStatus && p._crmStatus!=="New"&&<Tag bg={p._crmStatus==="Won"?"#052e16":p._crmStatus==="Lost"?"#1c1c1c":"#172554"} fg={p._crmStatus==="Won"?"#4ade80":p._crmStatus==="Lost"?"#525252":"#60a5fa"}>{p._crmStatus}</Tag>}{p._crmAssignee&&<span style={{fontSize:10,color:DIM}}>{p._crmAssignee}</span>}</div>
                <div style={{fontSize:13,color:"#d4d4d4",lineHeight:1.35,marginBottom:3}}>{p.overview}</div>
                <div style={{fontSize:11,color:MUTED}}>{p.city || "Los Gatos"}{p.neighborhood && ` · ${p.neighborhood}`}{p.zoning && ` · ${p.zoning}`}{p.apn && p.apn !== "TBD" && ` · APN ${p.apn}`}{p.dateFiled && ` · Filed ${new Date(p.dateFiled).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`} · {p.planner}</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
                {!isArchiveView && p._crmStatus !== "Archived" && <button onClick={e=>{e.stopPropagation();archiveLead(p._leadId)}} title="Archive this lead" style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:DIM,padding:"2px 4px",borderRadius:3,transition:"color 0.15s"}} onMouseEnter={e=>e.target.style.color="#fb923c"} onMouseLeave={e=>e.target.style.color=DIM}>✕</button>}
                <div style={{fontSize:14,color:DIM,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</div>
              </div>
            </div>
            {open&&(<div className="apex-card-body" style={{padding:"0 14px 14px",borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
              <CRMPanel key={p._leadId} leadId={p._leadId} onUpdate={handleCRMUpdate} />
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
    </div>
    </AuthWrapper>
  );
}
