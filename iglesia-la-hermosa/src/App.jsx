import { useState, useEffect } from "react";

// ─── Grupos ────────────────────────────────────────────────────────────────
const GROUPS = [
  { id: "0-3",  label: "Semillitas",      emoji: "🌱", color: "#f9a03f", bg: "#fff8f0" },
  { id: "4-7",  label: "Exploradorcitos", emoji: "🚀", color: "#4fc3f7", bg: "#f0faff" },
  { id: "8-12", label: "Aventureros",     emoji: "⚡", color: "#a78bfa", bg: "#f5f0ff" },
];
function groupOf(child) {
  const a = Number(child.age);
  if (a <= 3) return GROUPS[0];
  if (a <= 7) return GROUPS[1];
  return GROUPS[2];
}
function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// ─── Datos demo (solo si localStorage está vacío) ──────────────────────────
const DEMO_PARENTS = [
  { id: "p1", name: "María Martínez", phone: "555-1001", email: "maria@email.com", childrenIds: [1] },
  { id: "p2", name: "Carlos Martínez", phone: "555-1002", email: "", childrenIds: [1] },
  { id: "p3", name: "Ana Hernández",   phone: "555-2001", email: "ana@email.com",  childrenIds: [2] },
  { id: "p4", name: "José Cruz",       phone: "555-3001", email: "",               childrenIds: [3] },
];
const DEMO_CHILDREN = [
  { id: 1, name: "Sofía Martínez",   age: 5,  allergies: "Maní",    notes: "Tiene asma leve",       parentIds: ["p1","p2"], checkedIn: false, securityCode: "RT4KP" },
  { id: 2, name: "Lucas Hernández",  age: 2,  allergies: "",        notes: "",                       parentIds: ["p3"],      checkedIn: false, securityCode: "WX9QZ" },
  { id: 3, name: "Valentina Cruz",   age: 10, allergies: "Lactosa", notes: "Usar leche de almendra", parentIds: ["p4"],      checkedIn: false, securityCode: "MB3NF" },
  { id: 4, name: "Mateo López",      age: 8,  allergies: "",        notes: "",                       parentIds: [],          checkedIn: false, securityCode: "GH7YS" },
];

// ─── Persistencia ──────────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Photo helpers ─────────────────────────────────────────────────────────
function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function Avatar({ photo, emoji, color, size = 52, onClick, editable }) {
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: size * 0.27,
      background: photo ? "transparent" : `${color}20`,
      border: photo ? `2.5px solid ${color}40` : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, overflow: "hidden", flexShrink: 0,
      cursor: editable ? "pointer" : "default",
      position: "relative",
    }}>
      {photo
        ? <img src={photo} alt="foto" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        : <span>{emoji}</span>
      }
      {editable && (
        <div style={{
          position:"absolute", inset:0, background:"#0005", display:"flex",
          alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity .15s",
          borderRadius: size * 0.27,
        }}
          onMouseEnter={e=>e.currentTarget.style.opacity=1}
          onMouseLeave={e=>e.currentTarget.style.opacity=0}>
          <span style={{ color:"#fff", fontSize:18 }}>📷</span>
        </div>
      )}
    </div>
  );
}

// ─── UI Atoms ──────────────────────────────────────────────────────────────
function Badge({ group }) {
  return (
    <span style={{ background: group.bg, color: group.color, border: `1.5px solid ${group.color}40`,
      borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4 }}>
      {group.emoji} {group.label}
    </span>
  );
}
function Dot({ on }) {
  return <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", flexShrink:0,
    background: on ? "#22c55e" : "#d1d5db", boxShadow: on ? "0 0 0 3px #22c55e30" : "none" }} />;
}
function Btn({ children, onClick, color="#6366f1", outline, small, danger, disabled, style:ex={} }) {
  const bg = danger?"#ef4444": outline?"transparent": color;
  const bd = danger?"#ef4444": outline?"#6366f1": color;
  const tx = outline?(danger?"#ef4444":"#6366f1"):"#fff";
  return (
    <button disabled={disabled} onClick={onClick} style={{
      background:bg, border:`2px solid ${bd}`, color:tx,
      borderRadius:10, padding: small?"6px 14px":"10px 20px",
      fontSize: small?13:14, fontWeight:700, cursor: disabled?"not-allowed":"pointer",
      fontFamily:"inherit", opacity: disabled?.5:1, transition:"transform .1s, box-shadow .1s", ...ex
    }}
      onMouseEnter={e=>{ if(!disabled){ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 4px 14px ${bg}50`; }}}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
      {children}
    </button>
  );
}
function Field({ label, value, onChange, placeholder, type="text", required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#6b7280", marginBottom:6, letterSpacing:.5 }}>
        {label}{required && <span style={{color:"#ef4444"}}> *</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", boxSizing:"border-box", border:"2px solid #e5e7eb", borderRadius:10,
          padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none", transition:"border-color .15s" }}
        onFocus={e=>e.target.style.borderColor="#6366f1"}
        onBlur={e=>e.target.style.borderColor="#e5e7eb"} />
    </div>
  );
}
function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const h = e => e.key==="Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#0008", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff", borderRadius:20, padding:"28px 24px",
        maxWidth: wide?680:520, width:"100%", maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 24px 80px #0003", animation:"modalIn .18s cubic-bezier(.34,1.56,.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <h2 style={{ margin:0, fontSize:19, fontFamily:"Syne, sans-serif", color:"#1a1a2e" }}>{title}</h2>
          <button onClick={onClose} style={{ border:"none", background:"#f3f4f6", borderRadius:8,
            width:32, height:32, cursor:"pointer", fontSize:16, color:"#6b7280" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("dashboard");
  const [children, setKids]   = useState(() => load("mi_children", DEMO_CHILDREN));
  const [parents,  setParents]= useState(() => load("mi_parents",  DEMO_PARENTS));
  const [search,   setSearch] = useState("");
  const [filterG,  setFilterG]= useState("all");

  // persist
  useEffect(() => save("mi_children", children), [children]);
  useEffect(() => save("mi_parents",  parents),  [parents]);

  // modals
  const [addKidOpen,    setAddKidOpen]    = useState(false);
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [detailKid,     setDetailKid]     = useState(null);
  const [detailParent,  setDetailParent]  = useState(null);
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [codeInput,     setCodeInput]     = useState("");
  const [codeError,     setCodeError]     = useState("");
  const [codeOk,        setCodeOk]        = useState(false);

  // forms
  const emptyKid = { name:"", age:"", allergies:"", notes:"", parentIds:[] };
  const emptyPar = { name:"", phone:"", email:"", childrenIds:[] };
  const [kidForm, setKidForm]   = useState(emptyKid);
  const [parForm, setParForm]   = useState(emptyPar);
  // new parent inline inside kid form
  const [inlinePar, setInlinePar] = useState({ name:"", phone:"" });
  const [showInline, setShowInline] = useState(false);

  const checkedIn = children.filter(c=>c.checkedIn).length;
  const filtered  = children.filter(c => {
    const g = groupOf(c);
    return (filterG==="all" || g.id===filterG) &&
           c.name.toLowerCase().includes(search.toLowerCase());
  });
  const filteredParents = parents.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── helpers ──
  function checkIn(id)  { setKids(prev => prev.map(c => c.id===id ? {...c, checkedIn:true}  : c)); }
  function openCheckout(child) { setCheckoutModal(child); setCodeInput(""); setCodeError(""); setCodeOk(false); }
  function doCheckout() {
    if (codeInput.toUpperCase() === checkoutModal.securityCode) {
      setCodeOk(true);
      setTimeout(() => {
        setKids(prev => prev.map(c => c.id===checkoutModal.id ? {...c, checkedIn:false} : c));
        setCheckoutModal(null);
      }, 1200);
    } else {
      setCodeError("⚠️ Código incorrecto. Intenta de nuevo.");
      setTimeout(() => setCodeError(""), 2000);
    }
  }
  async function handlePhotoUpload(kidId, file) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setKids(prev => prev.map(c => c.id === kidId ? { ...c, photo: dataUrl } : c));
      // keep detailKid in sync
      setDetailKid(prev => prev && prev.id === kidId ? { ...prev, photo: dataUrl } : prev);
    } catch (e) { console.error(e); }
  }
  function removePhoto(kidId) {
    setKids(prev => prev.map(c => c.id === kidId ? { ...c, photo: null } : c));
    setDetailKid(prev => prev && prev.id === kidId ? { ...prev, photo: null } : prev);
  }

  function deleteKid(id) {
    setKids(prev => prev.filter(c => c.id!==id));
    setParents(prev => prev.map(p => ({ ...p, childrenIds: p.childrenIds.filter(x=>x!==id) })));
    setDetailKid(null);
  }
  function deleteParent(id) {
    setParents(prev => prev.filter(p => p.id!==id));
    setKids(prev => prev.map(c => ({ ...c, parentIds: c.parentIds.filter(x=>x!==id) })));
    setDetailParent(null);
  }

  function saveKid() {
    if (!kidForm.name || !kidForm.age) return;
    let pids = [...kidForm.parentIds];
    // create inline parent if filled
    if (showInline && inlinePar.name.trim()) {
      const newPar = { id:"p"+Date.now(), name:inlinePar.name.trim(), phone:inlinePar.phone.trim(), email:"", childrenIds:[] };
      pids = [...pids, newPar.id];
      setParents(prev => {
        const updated = [...prev, { ...newPar, childrenIds:[] }];
        return updated;
      });
      // we'll fix childrenIds after we have the kid id
    }
    const newKid = { id: Date.now(), name:kidForm.name, age:Number(kidForm.age),
      allergies:kidForm.allergies, notes:kidForm.notes, parentIds:pids,
      checkedIn:false, securityCode:generateCode() };
    setKids(prev => [...prev, newKid]);
    // update parents' childrenIds
    setParents(prev => prev.map(p => pids.includes(p.id) ? { ...p, childrenIds:[...p.childrenIds, newKid.id] } : p));
    setKidForm(emptyKid); setInlinePar({ name:"", phone:"" }); setShowInline(false); setAddKidOpen(false);
  }

  function saveParent() {
    if (!parForm.name) return;
    const newPar = { id:"p"+Date.now(), name:parForm.name, phone:parForm.phone, email:parForm.email, childrenIds:parForm.childrenIds };
    setParents(prev => [...prev, newPar]);
    // link kids
    setKids(prev => prev.map(c => parForm.childrenIds.includes(c.id) ? { ...c, parentIds:[...c.parentIds, newPar.id] } : c));
    setParForm(emptyPar); setAddParentOpen(false);
  }

  function toggleKidInParForm(kidId) {
    setParForm(f => ({
      ...f,
      childrenIds: f.childrenIds.includes(kidId)
        ? f.childrenIds.filter(x=>x!==kidId)
        : [...f.childrenIds, kidId]
    }));
  }
  function toggleParInKidForm(parId) {
    setKidForm(f => ({
      ...f,
      parentIds: f.parentIds.includes(parId)
        ? f.parentIds.filter(x=>x!==parId)
        : [...f.parentIds, parId]
    }));
  }

  const TABS = [
    { id:"dashboard", label:"📊 Dashboard" },
    { id:"checkin",   label:"✅ Check-in" },
    { id:"children",  label:"👦 Niños" },
    { id:"parents",   label:"👪 Padres" },
    { id:"reports",   label:"📋 Reportes" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box} body{margin:0;font-family:'DM Sans',sans-serif;background:#f0f2f8}
        @keyframes modalIn{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:none}}
        @keyframes fadeIn {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0f2f8,#e8eaf6)" }}>

        {/* Header */}
        <header style={{ background:"#1a1a2e", padding:"0 20px", display:"flex",
          alignItems:"center", justifyContent:"space-between", height:60, boxShadow:"0 4px 24px #0003" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10,
              background:"linear-gradient(135deg,#6366f1,#a78bfa)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🕊️</div>
            <div>
              <div style={{ color:"#fff", fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:16, lineHeight:1 }}>Iglesia La Hermosa</div>
              <div style={{ color:"#a5b4fc", fontSize:11 }}>Ministerio Infantil · datos guardados localmente</div>
            </div>
          </div>
          <div style={{ background:"#22c55e20", border:"1.5px solid #22c55e50", borderRadius:99,
            padding:"3px 12px", color:"#4ade80", fontSize:13, fontWeight:700,
            display:"flex", alignItems:"center", gap:6 }}>
            <Dot on /> {checkedIn} dentro
          </div>
        </header>

        {/* Nav */}
        <nav style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 16px",
          display:"flex", gap:2, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none", border:"none", cursor:"pointer", padding:"13px 14px",
              fontSize:13, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap",
              color: tab===t.id?"#6366f1":"#6b7280",
              borderBottom: tab===t.id?"2.5px solid #6366f1":"2.5px solid transparent",
              transition:"color .15s"
            }}>{t.label}</button>
          ))}
        </nav>

        {/* Main */}
        <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 14px", animation:"fadeIn .2s ease" }}>

          {/* ── DASHBOARD ─────────────────────────────── */}
          {tab==="dashboard" && (
            <div>
              <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#1a1a2e", marginTop:0, marginBottom:22 }}>¡Bienvenido! 👋</h1>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
                {[
                  { label:"Niños registrados",  value:children.length,                              icon:"👦", color:"#6366f1" },
                  { label:"Padres registrados",  value:parents.length,                               icon:"👪", color:"#0ea5e9" },
                  { label:"Niños dentro ahora",  value:checkedIn,                                    icon:"✅", color:"#22c55e" },
                  { label:"Con alergias",        value:children.filter(c=>c.allergies).length,       icon:"⚠️", color:"#ef4444" },
                ].map(s => (
                  <div key={s.label} style={{ background:"#fff", borderRadius:14, padding:"18px",
                    boxShadow:"0 2px 10px #0001", borderTop:`3px solid ${s.color}` }}>
                    <div style={{ fontSize:26 }}>{s.icon}</div>
                    <div style={{ fontSize:30, fontWeight:800, fontFamily:"Syne", color:s.color, lineHeight:1.1, marginTop:6 }}>{s.value}</div>
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <h2 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17, color:"#1a1a2e", marginBottom:14 }}>Grupos de edad</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
                {GROUPS.map(g => {
                  const total  = children.filter(c=>groupOf(c).id===g.id).length;
                  const inside = children.filter(c=>groupOf(c).id===g.id && c.checkedIn).length;
                  return (
                    <div key={g.id} style={{ background:"#fff", borderRadius:18, padding:"20px",
                      boxShadow:"0 2px 10px #0001", border:`2px solid ${g.color}20` }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>{g.emoji}</div>
                      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, color:"#1a1a2e" }}>{g.label}</div>
                      <div style={{ color:"#9ca3af", fontSize:11, marginBottom:12 }}>{g.id} años</div>
                      <div style={{ display:"flex", gap:14, marginBottom:12 }}>
                        <div><div style={{ fontWeight:800, fontSize:20, color:g.color }}>{inside}</div><div style={{ fontSize:10, color:"#9ca3af" }}>dentro</div></div>
                        <div style={{ width:1, background:"#f3f4f6" }}/>
                        <div><div style={{ fontWeight:800, fontSize:20, color:"#9ca3af" }}>{total}</div><div style={{ fontSize:10, color:"#9ca3af" }}>total</div></div>
                      </div>
                      <div style={{ background:"#f3f4f6", borderRadius:99, height:5 }}>
                        <div style={{ background:g.color, borderRadius:99, height:"100%",
                          width: total?`${(inside/total)*100}%`:"0%", transition:"width .4s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {children.filter(c=>c.checkedIn).length > 0 && (
                <>
                  <h2 style={{ fontFamily:"Syne", fontWeight:700, fontSize:17, color:"#1a1a2e", marginBottom:12 }}>Dentro ahora 🏠</h2>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {children.filter(c=>c.checkedIn).map(c => (
                      <div key={c.id} style={{ background:"#fff", borderRadius:10, padding:"6px 14px 6px 6px",
                        display:"flex", alignItems:"center", gap:8, border:"1.5px solid #22c55e20",
                        boxShadow:"0 1px 6px #0001" }}>
                        <Avatar photo={c.photo} emoji={groupOf(c).emoji} color={groupOf(c).color} size={30}/>
                        <span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span>
                        <Badge group={groupOf(c)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CHECK-IN ──────────────────────────────── */}
          {tab==="checkin" && (
            <div>
              <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#1a1a2e", marginTop:0, marginBottom:20 }}>Check-in / Check-out</h1>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar niño..."
                style={{ width:"100%", border:"2px solid #e5e7eb", borderRadius:12, padding:"11px 16px",
                  fontSize:14, fontFamily:"inherit", marginBottom:18, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="#6366f1"}
                onBlur={e=>e.target.style.borderColor="#e5e7eb"} />
              <div style={{ display:"grid", gap:10 }}>
                {filtered.map(child => {
                  const g = groupOf(child);
                  const kidParents = parents.filter(p => child.parentIds.includes(p.id));
                  return (
                    <div key={child.id} style={{ background:"#fff", borderRadius:14, padding:"14px 18px",
                      boxShadow:"0 2px 10px #0001", display:"flex", alignItems:"center",
                      gap:14, flexWrap:"wrap", borderLeft:`4px solid ${child.checkedIn?"#22c55e":"#e5e7eb"}` }}>
                      <Avatar photo={child.photo} emoji={g.emoji} color={g.color} size={40}/>
                      <div style={{ flex:1, minWidth:140 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{child.name}</div>
                        <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:3, flexWrap:"wrap" }}>
                          <Badge group={g}/>
                          <span style={{ fontSize:11, color:"#9ca3af" }}>{child.age} años</span>
                          {child.allergies && <span style={{ background:"#fef2f2", color:"#ef4444",
                            border:"1.5px solid #fecaca", borderRadius:99, padding:"1px 7px", fontSize:11, fontWeight:700 }}>⚠️ {child.allergies}</span>}
                          {kidParents.length>0 && <span style={{ fontSize:11, color:"#6b7280" }}>👪 {kidParents.map(p=>p.name).join(", ")}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        {!child.checkedIn
                          ? <Btn onClick={()=>checkIn(child.id)} color="#22c55e" small>✅ Check-in</Btn>
                          : <Btn onClick={()=>openCheckout(child)} color="#ef4444" small>🚪 Check-out</Btn>}
                        <Btn onClick={()=>setDetailKid(child)} outline small>Ver</Btn>
                      </div>
                    </div>
                  );
                })}
                {filtered.length===0 && <div style={{ textAlign:"center", color:"#9ca3af", padding:"48px 0" }}>Sin resultados 🙁</div>}
              </div>
            </div>
          )}

          {/* ── NIÑOS ─────────────────────────────────── */}
          {tab==="children" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#1a1a2e", margin:0 }}>Niños registrados</h1>
                <Btn onClick={()=>{ setKidForm(emptyKid); setShowInline(false); setInlinePar({name:"",phone:""}); setAddKidOpen(true); }}>+ Registrar niño</Btn>
              </div>
              <div style={{ display:"flex", gap:7, marginBottom:16, flexWrap:"wrap" }}>
                {[{id:"all",label:"Todos",emoji:"👥"},...GROUPS].map(g=>(
                  <button key={g.id} onClick={()=>setFilterG(g.id)} style={{
                    background: filterG===g.id?"#6366f1":"#fff",
                    color: filterG===g.id?"#fff":"#374151",
                    border:`2px solid ${filterG===g.id?"#6366f1":"#e5e7eb"}`,
                    borderRadius:99, padding:"5px 14px", fontSize:12,
                    fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s"
                  }}>{g.emoji} {g.label}</button>
                ))}
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar..."
                style={{ width:"100%", border:"2px solid #e5e7eb", borderRadius:12, padding:"11px 16px",
                  fontSize:14, fontFamily:"inherit", marginBottom:18, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {filtered.map(child => {
                  const g = groupOf(child);
                  const kidParents = parents.filter(p=>child.parentIds.includes(p.id));
                  return (
                    <div key={child.id} onClick={()=>setDetailKid(child)} style={{
                      background:"#fff", borderRadius:16, padding:"18px",
                      boxShadow:"0 2px 10px #0001", cursor:"pointer",
                      border:"2px solid transparent", transition:"all .15s"
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=g.color; e.currentTarget.style.transform="translateY(-2px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.transform="";}}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, alignItems:"flex-start" }}>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <Avatar photo={child.photo} emoji={g.emoji} color={g.color} size={42}/>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{child.name}</div>
                            <div style={{ color:"#9ca3af", fontSize:11, marginTop:1 }}>{child.age} años</div>
                          </div>
                        </div>
                        <Dot on={child.checkedIn}/>
                      </div>
                      <Badge group={g}/>
                      {kidParents.length>0 && (
                        <div style={{ marginTop:8, fontSize:12, color:"#6b7280" }}>
                          👪 {kidParents.map(p=>p.name).join(" · ")}
                        </div>
                      )}
                      {child.allergies && (
                        <div style={{ marginTop:8, background:"#fef2f2", borderRadius:7,
                          padding:"5px 9px", fontSize:11, color:"#dc2626", fontWeight:600 }}>⚠️ {child.allergies}</div>
                      )}
                      <div style={{ marginTop:10, fontSize:11, color:"#9ca3af" }}>
                        🔑 <span style={{ fontWeight:700, color:"#6366f1", letterSpacing:2 }}>{child.securityCode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length===0 && <div style={{ textAlign:"center", color:"#9ca3af", padding:"48px 0" }}>Sin niños registrados aún</div>}
            </div>
          )}

          {/* ── PADRES ────────────────────────────────── */}
          {tab==="parents" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#1a1a2e", margin:0 }}>Padres / Tutores</h1>
                <Btn onClick={()=>{ setParForm(emptyPar); setAddParentOpen(true); }}>+ Registrar padre</Btn>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar padre..."
                style={{ width:"100%", border:"2px solid #e5e7eb", borderRadius:12, padding:"11px 16px",
                  fontSize:14, fontFamily:"inherit", marginBottom:18, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {filteredParents.map(p => {
                  const pKids = children.filter(c=>c.parentIds.includes(p.id));
                  return (
                    <div key={p.id} onClick={()=>setDetailParent(p)} style={{
                      background:"#fff", borderRadius:16, padding:"18px",
                      boxShadow:"0 2px 10px #0001", cursor:"pointer",
                      border:"2px solid transparent", transition:"all .15s"
                    }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.transform="translateY(-2px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.transform="";}}>
                      <div style={{ width:42, height:42, borderRadius:12, background:"#ede9fe",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:10 }}>👤</div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e" }}>{p.name}</div>
                      {p.phone && <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>📞 {p.phone}</div>}
                      {p.email && <div style={{ fontSize:12, color:"#6b7280", marginTop:1 }}>✉️ {p.email}</div>}
                      {pKids.length>0 && (
                        <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
                          {pKids.map(k => <Badge key={k.id} group={groupOf(k)}/>)}
                        </div>
                      )}
                      <div style={{ marginTop:8, fontSize:12, color:"#9ca3af" }}>
                        {pKids.length} hijo{pKids.length!==1?"s":""} · {pKids.map(k=>k.name).join(", ")||"sin niños vinculados"}
                      </div>
                    </div>
                  );
                })}
              </div>
              {filteredParents.length===0 && <div style={{ textAlign:"center", color:"#9ca3af", padding:"48px 0" }}>Sin padres registrados aún</div>}
            </div>
          )}

          {/* ── REPORTES ──────────────────────────────── */}
          {tab==="reports" && (
            <div>
              <h1 style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:"#1a1a2e", marginTop:0, marginBottom:6 }}>Reportes</h1>
              <p style={{ color:"#6b7280", marginBottom:24 }}>Resumen de asistencia del día.</p>
              <div style={{ background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 10px #0001", marginBottom:20 }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#1a1a2e" }}>Lista de asistencia</span>
                  <span style={{ fontSize:12, color:"#9ca3af" }}>{checkedIn}/{children.length} presentes</span>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:"#f9fafb" }}>
                        {["Nombre","Edad","Grupo","Estado","Padre/Madre","Alergias","Código"].map(h=>(
                          <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10,
                            fontWeight:700, color:"#6b7280", letterSpacing:.5, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((c,i) => {
                        const pNames = parents.filter(p=>c.parentIds.includes(p.id)).map(p=>p.name).join(", ");
                        return (
                          <tr key={c.id} style={{ background:i%2?"#fafafa":"#fff", borderBottom:"1px solid #f3f4f6" }}>
                            <td style={{ padding:"11px 16px", fontWeight:600, color:"#1a1a2e" }}>{c.name}</td>
                            <td style={{ padding:"11px 16px", color:"#6b7280" }}>{c.age}</td>
                            <td style={{ padding:"11px 16px" }}><Badge group={groupOf(c)}/></td>
                            <td style={{ padding:"11px 16px" }}>
                              <span style={{ background:c.checkedIn?"#dcfce7":"#f3f4f6", color:c.checkedIn?"#16a34a":"#9ca3af",
                                borderRadius:99, padding:"2px 9px", fontSize:11, fontWeight:700 }}>
                                {c.checkedIn?"✅ Presente":"🔲 Ausente"}
                              </span>
                            </td>
                            <td style={{ padding:"11px 16px", fontSize:12, color:"#374151" }}>{pNames||"—"}</td>
                            <td style={{ padding:"11px 16px", color:c.allergies?"#dc2626":"#d1d5db", fontSize:12 }}>{c.allergies||"—"}</td>
                            <td style={{ padding:"11px 16px", fontFamily:"monospace", fontWeight:700, color:"#6366f1", letterSpacing:2, fontSize:12 }}>{c.securityCode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {children.filter(c=>c.allergies).length>0 && (
                <div style={{ background:"#fef2f2", borderRadius:16, padding:"18px 20px", border:"1.5px solid #fecaca" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#dc2626", marginBottom:10 }}>⚠️ Alergias del grupo</div>
                  {children.filter(c=>c.allergies).map(c=>(
                    <div key={c.id} style={{ display:"flex", gap:10, fontSize:13, marginBottom:6, alignItems:"flex-start" }}>
                      <span style={{ fontWeight:600, color:"#1a1a2e", minWidth:150 }}>{c.name}</span>
                      <span style={{ color:"#dc2626", fontWeight:600 }}>{c.allergies}</span>
                      {c.notes && <span style={{ color:"#6b7280" }}>— {c.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── CHECKOUT MODAL ─────────────────────────── */}
      <Modal open={!!checkoutModal} onClose={()=>setCheckoutModal(null)} title="🚪 Verificar recogida">
        {checkoutModal && !codeOk && (
          <div>
            <div style={{ background:"#f9fafb", borderRadius:12, padding:"14px", marginBottom:18 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:8 }}>
                <Avatar photo={checkoutModal.photo} emoji={groupOf(checkoutModal).emoji} color={groupOf(checkoutModal).color} size={52}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{checkoutModal.name}</div>
                  <Badge group={groupOf(checkoutModal)}/>
                </div>
              </div>
              {(() => {
                const kParents = parents.filter(p=>checkoutModal.parentIds.includes(p.id));
                return kParents.length>0 && (
                  <div style={{ marginTop:10, fontSize:13, color:"#6b7280" }}>
                    <strong>Padres / autorizados:</strong>
                    <ul style={{ margin:"4px 0 0", paddingLeft:18 }}>
                      {kParents.map(p=><li key={p.id}>{p.name}{p.phone?` · ${p.phone}`:""}</li>)}
                    </ul>
                  </div>
                );
              })()}
              {checkoutModal.allergies && (
                <div style={{ marginTop:8, background:"#fef2f2", borderRadius:7, padding:"5px 9px", fontSize:11, color:"#dc2626", fontWeight:600 }}>
                  ⚠️ {checkoutModal.allergies}
                </div>
              )}
            </div>
            <Field label="Código de seguridad" value={codeInput}
              onChange={v=>{setCodeInput(v); setCodeError("");}} placeholder={`Código del niño (5 letras/números)`}/>
            {codeError && <div style={{ color:"#ef4444", fontSize:12, marginTop:-10, marginBottom:12 }}>{codeError}</div>}
            <Btn onClick={doCheckout} style={{ width:"100%" }}>Confirmar recogida</Btn>
          </div>
        )}
        {codeOk && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:52 }}>✅</div>
            <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:19, color:"#22c55e", marginTop:10 }}>¡Código correcto!</div>
            <div style={{ color:"#6b7280", marginTop:4 }}>Recogida confirmada</div>
          </div>
        )}
      </Modal>

      {/* ── DETAIL KID ─────────────────────────────── */}
      <Modal open={!!detailKid} onClose={()=>setDetailKid(null)} title="👦 Perfil del niño">
        {detailKid && (() => {
          const g = groupOf(detailKid);
          const kParents = parents.filter(p=>detailKid.parentIds.includes(p.id));
          return (
            <div>
              {/* Photo + name header */}
              <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:18 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                  <label style={{ cursor:"pointer" }} title="Cambiar foto">
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={e => handlePhotoUpload(detailKid.id, e.target.files[0])}/>
                    <Avatar photo={detailKid.photo} emoji={g.emoji} color={g.color} size={72} editable/>
                  </label>
                  {detailKid.photo
                    ? <button onClick={()=>removePhoto(detailKid.id)} style={{
                        border:"none", background:"none", color:"#ef4444", fontSize:10,
                        cursor:"pointer", fontWeight:700, padding:0, fontFamily:"inherit"
                      }}>Quitar foto</button>
                    : <span style={{ fontSize:10, color:"#9ca3af", textAlign:"center", maxWidth:72 }}>Toca para agregar foto</span>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:19, color:"#1a1a2e" }}>{detailKid.name}</div>
                  <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    <Badge group={g}/>
                    <span style={{ fontSize:11, color:"#9ca3af" }}>{detailKid.age} años</span>
                    <Dot on={detailKid.checkedIn}/>
                  </div>
                </div>
              </div>
              {[
                { label:"Código de seguridad", value:detailKid.securityCode, mono:true, accent:true },
                { label:"Alergias", value:detailKid.allergies||"Ninguna" },
                { label:"Notas", value:detailKid.notes||"Sin notas" },
              ].map(f=>(
                <div key={f.label} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:.5, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                  <div style={{ fontFamily:f.mono?"monospace":"inherit", fontWeight:f.mono?700:400,
                    color:f.accent?"#6366f1":"#374151", fontSize:f.mono?17:13, letterSpacing:f.mono?3:0 }}>{f.value}</div>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:.5, textTransform:"uppercase", marginBottom:6 }}>Padres / Tutores</div>
                {kParents.length>0 ? kParents.map(p=>(
                  <div key={p.id} style={{ display:"flex", gap:8, alignItems:"center", background:"#f9fafb",
                    borderRadius:8, padding:"8px 12px", marginBottom:6, fontSize:13 }}>
                    <span style={{ fontSize:18 }}>👤</span>
                    <div>
                      <div style={{ fontWeight:600, color:"#1a1a2e" }}>{p.name}</div>
                      {p.phone && <div style={{ fontSize:11, color:"#6b7280" }}>📞 {p.phone}</div>}
                    </div>
                  </div>
                )) : <span style={{ fontSize:12, color:"#9ca3af" }}>Sin padres vinculados</span>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={()=>{ if(!detailKid.checkedIn) checkIn(detailKid.id); else openCheckout(detailKid); setDetailKid(null); }}
                  color={detailKid.checkedIn?"#ef4444":"#22c55e"} style={{ flex:1 }}>
                  {detailKid.checkedIn?"🚪 Check-out":"✅ Check-in"}
                </Btn>
                <Btn onClick={()=>{ if(window.confirm("¿Eliminar este niño?")) deleteKid(detailKid.id); }} danger outline small>🗑️</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── DETAIL PARENT ──────────────────────────── */}
      <Modal open={!!detailParent} onClose={()=>setDetailParent(null)} title="👪 Perfil del padre/madre">
        {detailParent && (() => {
          const pKids = children.filter(c=>c.parentIds.includes(detailParent.id));
          return (
            <div>
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:18 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:"#ede9fe",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
                <div>
                  <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:19, color:"#1a1a2e" }}>{detailParent.name}</div>
                  {detailParent.phone && <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>📞 {detailParent.phone}</div>}
                  {detailParent.email && <div style={{ fontSize:13, color:"#6b7280" }}>✉️ {detailParent.email}</div>}
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:.5, textTransform:"uppercase", marginBottom:8 }}>Hijos vinculados</div>
                {pKids.length>0 ? pKids.map(k=>(
                  <div key={k.id} style={{ display:"flex", gap:8, alignItems:"center", background:"#f9fafb",
                    borderRadius:8, padding:"8px 12px", marginBottom:6 }}>
                    <span style={{ fontSize:18 }}>{groupOf(k).emoji}</span>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:"#1a1a2e" }}>{k.name}</div>
                      <Badge group={groupOf(k)}/>
                    </div>
                    <Dot on={k.checkedIn}/>
                  </div>
                )) : <span style={{ fontSize:12, color:"#9ca3af" }}>Sin niños vinculados</span>}
              </div>
              <Btn onClick={()=>{ if(window.confirm("¿Eliminar este padre?")) deleteParent(detailParent.id); }} danger outline style={{ width:"100%" }}>
                🗑️ Eliminar padre
              </Btn>
            </div>
          );
        })()}
      </Modal>

      {/* ── ADD KID MODAL ──────────────────────────── */}
      <Modal open={addKidOpen} onClose={()=>setAddKidOpen(false)} title="➕ Registrar nuevo niño" wide>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
          <div>
            <Field label="Nombre completo" value={kidForm.name} onChange={v=>setKidForm(f=>({...f,name:v}))} placeholder="Ej: Ana García" required/>
            <Field label="Edad" value={kidForm.age}  onChange={v=>setKidForm(f=>({...f,age:v}))}  placeholder="Ej: 7" type="number" required/>
            <Field label="Alergias" value={kidForm.allergies} onChange={v=>setKidForm(f=>({...f,allergies:v}))} placeholder="Ej: maní, lactosa"/>
            <Field label="Notas especiales" value={kidForm.notes} onChange={v=>setKidForm(f=>({...f,notes:v}))} placeholder="Observaciones..."/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", marginBottom:8, letterSpacing:.5 }}>VINCULAR A PADRE(S) EXISTENTE(S)</div>
            <div style={{ maxHeight:180, overflowY:"auto", border:"2px solid #e5e7eb", borderRadius:10, padding:8, marginBottom:14 }}>
              {parents.length===0 && <div style={{ fontSize:12, color:"#9ca3af", padding:8 }}>Aún no hay padres registrados</div>}
              {parents.map(p=>(
                <label key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 4px", cursor:"pointer", fontSize:13 }}>
                  <input type="checkbox" checked={kidForm.parentIds.includes(p.id)} onChange={()=>toggleParInKidForm(p.id)}/>
                  <span style={{ fontWeight:600 }}>{p.name}</span>
                  {p.phone && <span style={{ color:"#9ca3af", fontSize:11 }}>{p.phone}</span>}
                </label>
              ))}
            </div>

            <button onClick={()=>setShowInline(v=>!v)} style={{
              background:"none", border:"2px dashed #a5b4fc", borderRadius:10,
              width:"100%", padding:"8px", fontSize:12, color:"#6366f1", fontWeight:700,
              cursor:"pointer", marginBottom: showInline?10:0, fontFamily:"inherit"
            }}>
              {showInline?"▲ Ocultar":"＋ Crear nuevo padre aquí"}
            </button>
            {showInline && (
              <div style={{ background:"#f5f3ff", borderRadius:10, padding:"12px", border:"1.5px solid #c4b5fd" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7c3aed", marginBottom:8 }}>NUEVO PADRE / TUTOR</div>
                <Field label="Nombre" value={inlinePar.name} onChange={v=>setInlinePar(f=>({...f,name:v}))} placeholder="Nombre completo"/>
                <Field label="Teléfono" value={inlinePar.phone} onChange={v=>setInlinePar(f=>({...f,phone:v}))} placeholder="Ej: 555-0000"/>
              </div>
            )}
          </div>
        </div>
        <div style={{ background:"#f0f9ff", borderRadius:9, padding:"9px 13px", fontSize:12, color:"#0369a1", margin:"14px 0" }}>
          💡 Se generará automáticamente un código de seguridad único.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={saveKid} style={{ flex:1 }} disabled={!kidForm.name||!kidForm.age}>Registrar niño</Btn>
          <Btn onClick={()=>setAddKidOpen(false)} outline>Cancelar</Btn>
        </div>
      </Modal>

      {/* ── ADD PARENT MODAL ───────────────────────── */}
      <Modal open={addParentOpen} onClose={()=>setAddParentOpen(false)} title="➕ Registrar padre / tutor" wide>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
          <div>
            <Field label="Nombre completo" value={parForm.name}  onChange={v=>setParForm(f=>({...f,name:v}))}  placeholder="Ej: María González" required/>
            <Field label="Teléfono"        value={parForm.phone} onChange={v=>setParForm(f=>({...f,phone:v}))} placeholder="Ej: 555-1234"/>
            <Field label="Email"           value={parForm.email} onChange={v=>setParForm(f=>({...f,email:v}))} placeholder="Ej: correo@email.com" type="email"/>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", marginBottom:8, letterSpacing:.5 }}>VINCULAR HIJOS</div>
            <div style={{ maxHeight:220, overflowY:"auto", border:"2px solid #e5e7eb", borderRadius:10, padding:8 }}>
              {children.length===0 && <div style={{ fontSize:12, color:"#9ca3af", padding:8 }}>Aún no hay niños registrados</div>}
              {children.map(c=>(
                <label key={c.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 4px", cursor:"pointer" }}>
                  <input type="checkbox" checked={parForm.childrenIds.includes(c.id)} onChange={()=>toggleKidInParForm(c.id)}/>
                  <span style={{ fontSize:13, fontWeight:600 }}>{c.name}</span>
                  <Badge group={groupOf(c)}/>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <Btn onClick={saveParent} style={{ flex:1 }} disabled={!parForm.name}>Registrar padre</Btn>
          <Btn onClick={()=>setAddParentOpen(false)} outline>Cancelar</Btn>
        </div>
      </Modal>
    </>
  );
}
