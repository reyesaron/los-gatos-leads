'use client';
import { useState, useMemo } from "react";
import { getLeadScore } from "@/data/scoring";
import CRMPanel from "@/components/CRMPanel";

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

export default function App({ projects: PROJECTS, letterPages: LETTER_PAGES, scrapedLetters: SCRAPED_LETTERS, scrapedAt }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [expanded, setExpanded] = useState(null);
  const [minScore, setMinScore] = useState(0);
  const [hoodFilter, setHoodFilter] = useState("All");
  const scored = useMemo(() => PROJECTS.map(p => {
    const isNew = scrapedAt ? p.firstSeen === scrapedAt : (p.dateFiled && (Date.now() - new Date(p.dateFiled)) < 7 * 24 * 60 * 60 * 1000);
    return { ...p, ...getLeadScore(p), isNew };
  }), []);
  const categories = ["All", ...new Set(PROJECTS.map(p => p.category))];
  const cities = ["All", ...new Set(PROJECTS.map(p => p.city || "Los Gatos"))];
  const neighborhoods = useMemo(() => {
    const relevant = scored.filter(p => cityFilter === "All" || (p.city || "Los Gatos") === cityFilter);
    const hoods = [...new Set(relevant.map(p => p.neighborhood).filter(Boolean))].sort();
    return hoods.length > 0 ? ["All", ...hoods] : [];
  }, [scored, cityFilter]);
  const filtered = useMemo(() => {
    let list = scored;
    if (cityFilter !== "All") list = list.filter(p => (p.city || "Los Gatos") === cityFilter);
    if (hoodFilter !== "All") list = list.filter(p => p.neighborhood === hoodFilter);
    if (catFilter !== "All") list = list.filter(p => p.category === catFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.address.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)||p.scope.toLowerCase().includes(q)||p.planner.toLowerCase().includes(q)||p.zoning.toLowerCase().includes(q)||p.apn.toLowerCase().includes(q)||p.overview.toLowerCase().includes(q)); }
    if (minScore > 0) list = list.filter(p => p.score >= minScore);
    list.sort((a,b) => { if (sortBy==="score") return b.score-a.score; if (sortBy==="date") return new Date(b.dateFiled)-new Date(a.dateFiled); return a.address.localeCompare(b.address); });
    return list;
  }, [scored, catFilter, cityFilter, hoodFilter, search, sortBy, minScore]);
  const stats = useMemo(() => ({ total:filtered.length, newLeads:filtered.filter(p=>p.isNew).length, hot:filtered.filter(p=>p.score>=7).length, nc:filtered.filter(p=>p.category==="New Construction").length, add:filtered.filter(p=>p.category==="Addition").length, sub:filtered.filter(p=>p.category==="Subdivision").length }), [filtered]);
  const iS = {padding:"8px 12px",borderRadius:6,border:`1px solid ${BORDER}`,background:"#111",color:TEXT,fontSize:13,outline:"none"};
  const catC = {"New Construction":{bg:RED_DARK,fg:RED},Addition:{bg:"#1c1c1c",fg:"#d4d4d4"},Subdivision:{bg:"#1c1c1c",fg:MUTED}};

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:BG,minHeight:"100vh",color:TEXT}}>
      {/* HEADER */}
      <div style={{background:"linear-gradient(145deg,#0f0f0f,#141414,#0f0f0f)",borderBottom:`1px solid ${BORDER}`,padding:"20px 20px 16px"}}>
        <div style={{maxWidth:980,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <img src="/apex-logo-full.jpg" alt="Apex Design Build" style={{height:48,borderRadius:6,flexShrink:0}} />
            <div style={{borderLeft:`2px solid ${RED}`,paddingLeft:14}}>
              <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>Construction Leads</h1>
              <p style={{margin:0,fontSize:12,color:MUTED}}>Los Gatos · Saratoga · San Jose · {PROJECTS.length} projects{scrapedAt && ` · Updated ${new Date(scrapedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:18,marginTop:14,flexWrap:"wrap"}}>
            {[
              {l:"Projects",v:stats.total,c:MUTED},
              {l:"New",v:stats.newLeads,c:RED,pulse:true},
              {l:"Hot (7+)",v:stats.hot,c:"#fff"},
              {l:"New Const.",v:stats.nc,c:TEXT},
              {l:"Additions",v:stats.add,c:MUTED},
              {l:"Subdivisions",v:stats.sub,c:DIM},
            ].map(s=><div key={s.l} style={{display:"flex",alignItems:"baseline",gap:5}}><span className={s.pulse&&s.v>0?"badge-new":""} style={{fontSize:21,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</span><span style={{fontSize:11,color:MUTED}}>{s.l}</span></div>)}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"10px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input type="text" placeholder="Search address, APN, planner, zoning, description..." value={search} onChange={e=>setSearch(e.target.value)} style={{...iS,flex:"1 1 200px",minWidth:160}} />
          <select value={cityFilter} onChange={e=>{setCityFilter(e.target.value);setHoodFilter("All")}} style={{...iS,cursor:"pointer"}}>{cities.map(c=><option key={c} value={c}>{c==="All"?"City: All":c}</option>)}</select>
          {neighborhoods.length>0&&<select value={hoodFilter} onChange={e=>setHoodFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{neighborhoods.map(n=><option key={n} value={n}>{n==="All"?"Neighborhood: All":n}</option>)}</select>}
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...iS,cursor:"pointer"}}><option value="score">Sort: Lead Score</option><option value="date">Sort: Newest</option><option value="address">Sort: Address</option></select>
          <select value={minScore} onChange={e=>setMinScore(+e.target.value)} style={{...iS,cursor:"pointer"}}><option value={0}>Min: Any</option><option value={4}>Min: 4+</option><option value={7}>Min: 7+</option></select>
        </div>
      </div>

      {/* A-Z NAV */}
      {(cityFilter === "All" || cityFilter === "Los Gatos") && <div style={{maxWidth:980,margin:"0 auto",padding:"14px 20px 0"}}>
        <div style={{background:CARD,borderRadius:8,padding:"10px 14px",border:`1px solid ${BORDER}`}}>
          <div style={{fontSize:11,color:MUTED,marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Browse All Streets — LosGatosCA.gov</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {Object.entries(LETTER_PAGES).map(([l,url])=>{const sc=SCRAPED_LETTERS.includes(l);return<a key={l} href={url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:l.length>1?"auto":28,height:28,borderRadius:4,background:sc?"#1a1a1a":BG,color:sc?"#fff":DIM,fontSize:11,fontWeight:600,textDecoration:"none",border:`1px solid ${sc?`${RED}33`:BORDER}`,padding:l.length>1?"0 7px":0,transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.background=RED;e.target.style.color="#fff"}} onMouseLeave={e=>{e.target.style.background=sc?"#1a1a1a":BG;e.target.style.color=sc?"#fff":DIM}}>{l}</a>})}
          </div>
          <div style={{fontSize:10,color:DIM,marginTop:5}}>Highlighted = data loaded</div>
        </div>
      </div>}

      {/* PROJECT CARDS */}
      <div style={{maxWidth:980,margin:"0 auto",padding:"10px 20px 40px"}}>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:MUTED}}>No projects match your filters.</div>}
        {filtered.map((p,i)=>{const open=expanded===i;const cc=catC[p.category]||{bg:"#1c1c1c",fg:MUTED};return(
          <div key={p.address+p.appNumber} style={{background:CARD,borderRadius:8,border:`1px solid ${p.isNew?RED:p.score>=7?RED_MID:BORDER}`,marginBottom:6,overflow:"hidden",borderLeft:p.isNew?`3px solid ${RED}`:undefined}}>
            <div onClick={()=>setExpanded(open?null:i)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flexShrink:0,paddingTop:1}}><Badge score={p.score}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}><span style={{fontWeight:700,fontSize:14,color:"#fff"}}>{p.address}</span>{p.isNew&&<NewBadge/>}<Tag bg={cc.bg} fg={cc.fg}>{p.category}</Tag></div>
                <div style={{fontSize:13,color:"#d4d4d4",lineHeight:1.35,marginBottom:3}}>{p.overview}</div>
                <div style={{fontSize:11,color:MUTED}}>{p.city || "Los Gatos"}{p.neighborhood && ` · ${p.neighborhood}`}{p.zoning && ` · ${p.zoning}`}{p.apn && p.apn !== "TBD" && ` · APN ${p.apn}`}{p.dateFiled && ` · Filed ${new Date(p.dateFiled).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`} · {p.planner}</div>
              </div>
              <div style={{flexShrink:0,fontSize:14,color:DIM,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</div>
            </div>
            {open&&(<div style={{padding:"0 14px 14px",borderTop:`1px solid ${BORDER}`,paddingTop:12}}>
              <CRMPanel leadId={btoa(encodeURIComponent(p.address + "|" + (p.appNumber || p.scope))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)} />
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
                <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:6,background:RED,color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none",transition:"background 0.15s"}} onMouseEnter={e=>e.target.style.background=RED_MID} onMouseLeave={e=>e.target.style.background=RED}>View Project</a>
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
    </div>
  );
}
