'use client';
import { useState, useMemo } from "react";
import { getLeadScore } from "@/data/scoring";

function Badge({score}){const c=score>=7?"#16a34a":score>=4?"#d97706":"#94a3b8";const bg=score>=7?"#052e16":score>=4?"#451a03":"#1e293b";return<span style={{display:"inline-flex",alignItems:"center",background:bg,color:c,fontWeight:700,fontSize:13,padding:"3px 10px",borderRadius:6,fontFamily:"'JetBrains Mono',monospace",border:`1.5px solid ${c}33`}}>{score}/10</span>}
function Tag({children,bg,fg}){return<span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",padding:"2px 8px",borderRadius:4,background:bg,color:fg,whiteSpace:"nowrap"}}>{children}</span>}
function NewBadge(){return<span className="badge-new" style={{display:"inline-flex",alignItems:"center",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",padding:"2px 7px",borderRadius:4,background:"#14532d",color:"#4ade80",border:"1px solid #22c55e55",whiteSpace:"nowrap"}}>NEW</span>}

export default function App({ projects: PROJECTS, letterPages: LETTER_PAGES, scrapedLetters: SCRAPED_LETTERS, scrapedAt }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [expanded, setExpanded] = useState(null);
  const [minScore, setMinScore] = useState(0);
  const scored = useMemo(() => PROJECTS.map(p => {
    const isNew = scrapedAt ? p.firstSeen === scrapedAt : (p.dateFiled && (Date.now() - new Date(p.dateFiled)) < 7 * 24 * 60 * 60 * 1000);
    return { ...p, ...getLeadScore(p), isNew };
  }), []);
  const categories = ["All", ...new Set(PROJECTS.map(p => p.category))];
  const cities = ["All", ...new Set(PROJECTS.map(p => p.city || "Los Gatos"))];
  const filtered = useMemo(() => {
    let list = scored;
    if (cityFilter !== "All") list = list.filter(p => (p.city || "Los Gatos") === cityFilter);
    if (catFilter !== "All") list = list.filter(p => p.category === catFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.address.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)||p.scope.toLowerCase().includes(q)||p.planner.toLowerCase().includes(q)||p.zoning.toLowerCase().includes(q)||p.apn.toLowerCase().includes(q)||p.overview.toLowerCase().includes(q)); }
    if (minScore > 0) list = list.filter(p => p.score >= minScore);
    list.sort((a,b) => { if (sortBy==="score") return b.score-a.score; if (sortBy==="date") return new Date(b.dateFiled)-new Date(a.dateFiled); return a.address.localeCompare(b.address); });
    return list;
  }, [scored, catFilter, cityFilter, search, sortBy, minScore]);
  const stats = useMemo(() => ({ total:filtered.length, newLeads:filtered.filter(p=>p.isNew).length, hot:filtered.filter(p=>p.score>=7).length, nc:filtered.filter(p=>p.category==="New Construction").length, add:filtered.filter(p=>p.category==="Addition").length, sub:filtered.filter(p=>p.category==="Subdivision").length }), [filtered]);
  const iS = {padding:"8px 12px",borderRadius:8,border:"1px solid #334155",background:"#0f172a",color:"#e2e8f0",fontSize:13,outline:"none"};
  const catC = {"New Construction":{bg:"#172554",fg:"#60a5fa"},Addition:{bg:"#422006",fg:"#fbbf24"},Subdivision:{bg:"#2e1065",fg:"#a78bfa"}};

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#0b1120",minHeight:"100vh",color:"#e2e8f0"}}>
      <div style={{background:"linear-gradient(145deg,#0f172a,#162032,#0f172a)",borderBottom:"1px solid #1e293b",padding:"24px 20px 18px"}}>
        <div style={{maxWidth:980,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏗</div>
            <div><h1 style={{margin:0,fontSize:21,fontWeight:700,color:"#f8fafc",letterSpacing:"-0.02em"}}>Construction Leads</h1><p style={{margin:0,fontSize:12,color:"#64748b"}}>Los Gatos & Saratoga pending planning projects · {PROJECTS.length} projects{scrapedAt && ` · Updated ${new Date(scrapedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}`}</p></div>
          </div>
          <div style={{display:"flex",gap:18,marginTop:14,flexWrap:"wrap"}}>
            {[{l:"Projects",v:stats.total,c:"#94a3b8"},{l:"New",v:stats.newLeads,c:"#4ade80",pulse:true},{l:"Hot (7+)",v:stats.hot,c:"#22c55e"},{l:"New Const.",v:stats.nc,c:"#3b82f6"},{l:"Additions",v:stats.add,c:"#eab308"},{l:"Subdivisions",v:stats.sub,c:"#a78bfa"}].map(s=><div key={s.l} style={{display:"flex",alignItems:"baseline",gap:5}}><span className={s.pulse&&s.v>0?"badge-new":""} style={{fontSize:21,fontWeight:700,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</span><span style={{fontSize:11,color:"#64748b"}}>{s.l}</span></div>)}
          </div>
        </div>
      </div>
      <div style={{background:"#141c2e",borderBottom:"1px solid #1e293b",padding:"10px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input type="text" placeholder="Search address, APN, planner, zoning, description…" value={search} onChange={e=>setSearch(e.target.value)} style={{...iS,flex:"1 1 200px",minWidth:160}} />
          <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{cities.map(c=><option key={c} value={c}>{c==="All"?"City: All":c}</option>)}</select>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...iS,cursor:"pointer"}}>{categories.map(c=><option key={c}>{c}</option>)}</select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...iS,cursor:"pointer"}}><option value="score">Sort: Lead Score</option><option value="date">Sort: Newest</option><option value="address">Sort: Address</option></select>
          <select value={minScore} onChange={e=>setMinScore(+e.target.value)} style={{...iS,cursor:"pointer"}}><option value={0}>Min: Any</option><option value={4}>Min: 4+</option><option value={7}>Min: 7+</option></select>
        </div>
      </div>
      <div style={{maxWidth:980,margin:"0 auto",padding:"14px 20px 0"}}>
        <div style={{background:"#141c2e",borderRadius:10,padding:"10px 14px",border:"1px solid #1e293b"}}>
          <div style={{fontSize:11,color:"#475569",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Browse All Streets — LosGatosCA.gov</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {Object.entries(LETTER_PAGES).map(([l,url])=>{const sc=SCRAPED_LETTERS.includes(l);return<a key={l} href={url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:l.length>1?"auto":28,height:28,borderRadius:5,background:sc?"#1e3a5f":"#0f172a",color:sc?"#60a5fa":"#475569",fontSize:11,fontWeight:600,textDecoration:"none",border:`1px solid ${sc?"#2563eb33":"#1e293b"}`,padding:l.length>1?"0 7px":0,transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.background="#3b82f6";e.target.style.color="#fff"}} onMouseLeave={e=>{e.target.style.background=sc?"#1e3a5f":"#0f172a";e.target.style.color=sc?"#60a5fa":"#475569"}}>{l}</a>})}
          </div>
          <div style={{fontSize:10,color:"#334155",marginTop:5}}>Highlighted = data loaded into this tool</div>
        </div>
      </div>
      <div style={{maxWidth:980,margin:"0 auto",padding:"10px 20px 40px"}}>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:"#475569"}}>No projects match your filters.</div>}
        {filtered.map((p,i)=>{const open=expanded===i;const cc=catC[p.category]||{bg:"#1e293b",fg:"#94a3b8"};return(
          <div key={p.address+p.appNumber} style={{background:"#141c2e",borderRadius:10,border:`1px solid ${p.isNew?"#22c55e":p.score>=7?"#166534":"#1e293b"}`,marginBottom:6,overflow:"hidden",borderLeft:p.isNew?"3px solid #4ade80":undefined}}>
            <div onClick={()=>setExpanded(open?null:i)} style={{padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="#1a2540"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flexShrink:0,paddingTop:1}}><Badge score={p.score}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}><span style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>{p.address}</span>{p.isNew&&<NewBadge/>}<Tag bg={cc.bg} fg={cc.fg}>{p.category}</Tag></div>
                <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.35,marginBottom:3}}>{p.overview}</div>
                <div style={{fontSize:11,color:"#475569"}}>{p.city || "Los Gatos"}{p.zoning && ` · ${p.zoning}`}{p.apn && ` · APN ${p.apn}`}{p.dateFiled && ` · Filed ${new Date(p.dateFiled).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`} · {p.planner}</div>
              </div>
              <div style={{flexShrink:0,fontSize:14,color:"#334155",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</div>
            </div>
            {open&&(<div style={{padding:"0 14px 14px",borderTop:"1px solid #1e293b",paddingTop:12}}>
              <p style={{margin:"0 0 10px",fontSize:13,color:"#94a3b8",lineHeight:1.45}}>{p.description}</p>
              <div style={{background:"#0b1120",borderRadius:8,padding:"10px 12px",marginBottom:10,border:"1px solid #1e293b"}}>
                <div style={{fontSize:11,fontWeight:600,color:"#475569",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Square Footage</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:4}}>
                  <div><span style={{fontSize:11,color:"#475569"}}>Existing: </span><span style={{fontSize:13,fontWeight:600,color:p.existingSF!==null?"#e2e8f0":"#334155",fontFamily:"'JetBrains Mono',monospace"}}>{p.existingSF!==null?(p.existingSF===0?"Vacant":`${p.existingSF.toLocaleString()} SF`):"—"}</span></div>
                  <div><span style={{fontSize:11,color:"#475569"}}>Proposed: </span><span style={{fontSize:13,fontWeight:600,color:p.proposedSF!==null?"#e2e8f0":"#334155",fontFamily:"'JetBrains Mono',monospace"}}>{p.proposedSF!==null?`${p.proposedSF.toLocaleString()} SF`:"—"}</span></div>
                </div>
                <div style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>📐 {p.sfNote}</div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{p.reasons.map((r,ri)=><span key={ri} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#0f172a",color:"#64748b",border:"1px solid #1e293b"}}>{r}</span>)}</div>
              <div style={{fontSize:12,color:"#475569",marginBottom:10}}><strong style={{color:"#64748b"}}>App #:</strong> {p.appNumber} · <strong style={{color:"#64748b"}}>Type:</strong> {p.appType} · <strong style={{color:"#64748b"}}>Status:</strong> {p.status}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <a href={p.pageUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:7,background:"linear-gradient(135deg,#2563eb,#4f46e5)",color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none"}}>↗ View on {p.city==="Saratoga"||p.city==="Saratoga (Unincorporated)"?"Saratoga.ca.us":"LosGatosCA.gov"}</a>
                {p.docs.map((d,di)=><a key={di} href={d.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,background:"#0b1120",color:"#64748b",fontSize:11,fontWeight:500,textDecoration:"none",border:"1px solid #1e293b",transition:"all 0.15s"}} onMouseEnter={e=>{e.target.style.borderColor="#2563eb";e.target.style.color="#93c5fd"}} onMouseLeave={e=>{e.target.style.borderColor="#1e293b";e.target.style.color="#64748b"}}>📄 {d.name}</a>)}
              </div>
            </div>)}
          </div>)})}
        <div style={{marginTop:20,padding:14,borderRadius:10,background:"#141c2e",border:"1px solid #1e293b",fontSize:11,color:"#475569",lineHeight:1.5}}>
          <strong style={{color:"#64748b"}}>Lead Scoring:</strong> 1–10 based on scope (multi-family &amp; custom homes highest → lot splits lowest), filing recency (&lt; 3 mo: +2, &lt; 6 mo: +1), and status (near hearing/approval: +1–2). <strong style={{color:"#64748b"}}>SF Data:</strong> The Town's listing pages don't publish square footage — that info lives in the plan PDFs. Existing/Proposed SF fields are ready for you to populate after reviewing plans. Highlighted letters in the A–Z nav = pages loaded into this tool.
        </div>
      </div>
    </div>
  );
}
