import { useState, useEffect, useRef } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────
const GROUPS = [
  { id:"0-3",  label:"Semillitas",      emoji:"🌱", color:"#f9a03f", bg:"#fff8f0" },
  { id:"4-7",  label:"Exploradorcitos", emoji:"🚀", color:"#4fc3f7", bg:"#f0faff" },
  { id:"8-12", label:"Aventureros",     emoji:"⚡", color:"#a78bfa", bg:"#f5f0ff" },
];
function groupOf(c) {
  const a = Number(c.age);
  if (a<=3) return GROUPS[0];
  if (a<=7) return GROUPS[1];
  return GROUPS[2];
}
function genId()   { return Math.random().toString(36).substring(2,10); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function dailyCode(childId) {
  // Deterministic code per child per day
  const seed = childId + todayStr();
  let h = 0;
  for (let i=0;i<seed.length;i++) { h = Math.imul(31,h)+seed.charCodeAt(i)|0; }
  return Math.abs(h).toString(36).slice(0,5).toUpperCase();
}
function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}) +
         " · " + d.toLocaleDateString("es-ES",{day:"2-digit",month:"short"});
}

// ─── Storage ───────────────────────────────────────────────────────────────
function load(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } }
function save(k,v) { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }

// ─── Demo seed data ────────────────────────────────────────────────────────
const SEED_USERS = [
  { id:"u1", email:"admin@iglesia.com",  password:"admin123",  role:"admin",  name:"Pastor Admin" },
  { id:"u2", email:"maria@email.com",    password:"maria123",  role:"parent", name:"María Martínez", childrenIds:["k1"] },
  { id:"u3", email:"ana@email.com",      password:"ana123",    role:"parent", name:"Ana Hernández",  childrenIds:["k2"] },
];
const SEED_CHILDREN = [
  { id:"k1", name:"Sofía Martínez",  age:5,  allergies:"Maní",    notes:"Tiene asma leve",       responsibleIds:["r1","r2"], checkedIn:false, photo:null, attendance:[] },
  { id:"k2", name:"Lucas Hernández", age:2,  allergies:"",        notes:"",                       responsibleIds:["r3"],      checkedIn:false, photo:null, attendance:[] },
  { id:"k3", name:"Valentina Cruz",  age:10, allergies:"Lactosa", notes:"Usar leche de almendra", responsibleIds:["r4"],      checkedIn:false, photo:null, attendance:[] },
  { id:"k4", name:"Mateo López",     age:8,  allergies:"",        notes:"",                       responsibleIds:[],          checkedIn:false, photo:null, attendance:[] },
];
const SEED_RESP = [
  { id:"r1", name:"María Martínez",  phone:"555-1001", relation:"Mamá",   userId:"u2" },
  { id:"r2", name:"Carlos Martínez", phone:"555-1002", relation:"Papá",   userId:null },
  { id:"r3", name:"Ana Hernández",   phone:"555-2001", relation:"Mamá",   userId:"u3" },
  { id:"r4", name:"José Cruz",       phone:"555-3001", relation:"Papá",   userId:null },
];

// ─── File reader ───────────────────────────────────────────────────────────
function readFile(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════
function Badge({group}){
  return <span style={{background:group.bg,color:group.color,border:`1.5px solid ${group.color}40`,
    borderRadius:99,padding:"2px 10px",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>
    {group.emoji} {group.label}</span>;
}
function Dot({on}){
  return <span style={{display:"inline-block",width:9,height:9,borderRadius:"50%",flexShrink:0,
    background:on?"#22c55e":"#d1d5db",boxShadow:on?"0 0 0 3px #22c55e30":"none"}}/>;
}
function Btn({children,onClick,color="#6366f1",outline,small,danger,disabled,full,style:ex={}}){
  const bg=danger?"#ef4444":outline?"transparent":color;
  const bd=danger?"#ef4444":outline?(danger?"#ef4444":"#6366f1"):color;
  const tx=outline?(danger?"#ef4444":"#6366f1"):"#fff";
  return <button disabled={disabled} onClick={onClick} style={{
    background:bg,border:`2px solid ${bd}`,color:tx,borderRadius:10,
    padding:small?"6px 14px":"10px 20px",fontSize:small?13:14,fontWeight:700,
    cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?.5:1,
    width:full?"100%":"auto",transition:"transform .1s,box-shadow .1s",...ex}}
    onMouseEnter={e=>{if(!disabled){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 4px 14px ${bg}50`;}}}
    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
    {children}</button>;
}
function Field({label,value,onChange,placeholder,type="text",required}){
  return <div style={{marginBottom:14}}>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:5,letterSpacing:.5,textTransform:"uppercase"}}>
      {label}{required&&<span style={{color:"#ef4444"}}> *</span>}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",border:"2px solid #e5e7eb",borderRadius:10,
        padding:"10px 14px",fontSize:14,fontFamily:"inherit",outline:"none",transition:"border-color .15s"}}
      onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/></div>;
}
function Modal({open,onClose,title,children,wide}){
  useEffect(()=>{ const h=e=>e.key==="Escape"&&onClose(); window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[onClose]);
  if(!open) return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"#0009",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,padding:"26px 22px",
      maxWidth:wide?700:500,width:"100%",maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 24px 80px #0004",animation:"modalIn .18s cubic-bezier(.34,1.56,.64,1)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:18,fontFamily:"Syne,sans-serif",color:"#1a1a2e"}}>{title}</h2>
        <button onClick={onClose} style={{border:"none",background:"#f3f4f6",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:15,color:"#6b7280"}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}
function Avatar({photo,emoji,color,size=44}){
  return <div style={{width:size,height:size,borderRadius:size*.27,background:photo?"transparent":`${color}20`,
    border:photo?`2px solid ${color}40`:"none",display:"flex",alignItems:"center",
    justifyContent:"center",fontSize:size*.46,overflow:"hidden",flexShrink:0}}>
    {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{emoji}</span>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// QR GENERATOR (pure canvas, no library)
// ═══════════════════════════════════════════════════════════════════════════
function QRCanvas({value, size=200}){
  const ref = useRef();
  useEffect(()=>{
    if(!ref.current||!value) return;
    const ctx = ref.current.getContext("2d");
    // Simple visual QR placeholder with encoded text pattern
    const s = size;
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,s,s);
    ctx.fillStyle="#1a1a2e";
    const cell = Math.floor(s/21);
    // Encode value into a pattern (simplified visual, not real QR)
    const hash = [...value].reduce((a,c,i)=>a^(c.charCodeAt(0)*(i+7)),0x5A3B);
    for(let r=0;r<21;r++) for(let c=0;c<21;c++){
      const bit = ((hash>>(r*c%32))^(r*7+c*3))&1;
      // Finder patterns (corners)
      const inFinder=(rr,cc)=>(rr<=6&&cc<=6)||(rr<=6&&cc>=14)||(rr>=14&&cc<=6);
      if(inFinder(r,c)){
        const fr=r<=6?r:(r>=14?r-14:r); const fc=c<=6?c:(c>=14?c-14:c);
        if(fr===0||fr===6||fc===0||fc===6||(fr>=2&&fr<=4&&fc>=2&&fc<=4))
          ctx.fillRect(c*cell,r*cell,cell,cell);
      } else if(bit){ ctx.fillRect(c*cell,r*cell,cell,cell); }
    }
  },[value,size]);
  return <canvas ref={ref} width={size} height={size} style={{borderRadius:8,border:"1px solid #e5e7eb"}}/>;
}

// ═══════════════════════════════════════════════════════════════════════════
// QR SCANNER (uses camera)
// ═══════════════════════════════════════════════════════════════════════════
function QRScanner({onScan, onClose}){
  const videoRef = useRef();
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState("");

  useEffect(()=>{
    let stream;
    navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment"}})
      .then(s=>{ stream=s; if(videoRef.current){ videoRef.current.srcObject=s; videoRef.current.play(); } })
      .catch(()=>setError("No se pudo acceder a la cámara. Usa el código manual."));
    return()=>{ stream?.getTracks().forEach(t=>t.stop()); };
  },[]);

  return <div>
    {!error && <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#000",marginBottom:16}}>
      <video ref={videoRef} style={{width:"100%",maxHeight:260,objectFit:"cover"}} playsInline muted/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{width:180,height:180,border:"3px solid #6366f1",borderRadius:16,
          boxShadow:"0 0 0 2000px #0005"}}/>
      </div>
      <div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center",color:"#fff",fontSize:12}}>
        Apunta al QR del responsable
      </div>
    </div>}
    {error && <div style={{background:"#fef2f2",borderRadius:10,padding:12,marginBottom:14,color:"#dc2626",fontSize:13}}>{error}</div>}
    <div style={{borderTop:"1px solid #f3f4f6",paddingTop:14}}>
      <Field label="O ingresa el código manualmente" value={manualCode} onChange={setManualCode} placeholder="Código del responsable"/>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={()=>manualCode&&onScan(manualCode)} full color="#6366f1">Verificar código</Btn>
        <Btn onClick={onClose} outline>Cancelar</Btn>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({users, onLogin, onRegister}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [error,setError]=useState("");

  function doLogin(){
    const u=users.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);
    if(u){ onLogin(u); setError(""); }
    else setError("Email o contraseña incorrectos.");
  }
  function doRegister(){
    if(!name||!email||!pass){ setError("Completa todos los campos."); return; }
    if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())){ setError("Este email ya está registrado."); return; }
    onRegister({id:"u"+Date.now(),email,password:pass,role:"parent",name,childrenIds:[]});
    setError("");
  }

  return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
      @keyframes modalIn{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:none}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      *{box-sizing:border-box}`}</style>
    <div style={{width:"100%",maxWidth:400,animation:"fadeUp .4s ease"}}>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#6366f1,#a78bfa)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 14px",
          boxShadow:"0 8px 32px #6366f150"}}>🕊️</div>
        <div style={{color:"#fff",fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:22}}>Iglesia La Hermosa</div>
        <div style={{color:"#a5b4fc",fontSize:13,marginTop:4}}>Ministerio Infantil</div>
      </div>

      {/* Card */}
      <div style={{background:"rgba(255,255,255,.07)",backdropFilter:"blur(20px)",borderRadius:20,
        padding:"28px 24px",border:"1px solid rgba(255,255,255,.12)"}}>
        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(0,0,0,.2)",borderRadius:10,padding:3,marginBottom:22}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,border:"none",
              background:mode===m?"#fff":"transparent",color:mode===m?"#1a1a2e":"#a5b4fc",
              borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              transition:"all .2s"}}>
              {m==="login"?"Iniciar sesión":"Crear cuenta"}
            </button>
          ))}
        </div>

        {mode==="register" && <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:"#a5b4fc",marginBottom:5,letterSpacing:.5}}>NOMBRE COMPLETO *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre"
            style={{width:"100%",background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",
              borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",color:"#fff",outline:"none"}}
            onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.12)"}/>
        </div>}

        {["email","password"].map((f,i)=>(
          <div key={f} style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:"#a5b4fc",marginBottom:5,letterSpacing:.5}}>
              {f==="email"?"EMAIL *":"CONTRASEÑA *"}</label>
            <input type={f==="email"?"email":"password"} value={f==="email"?email:pass}
              onChange={e=>f==="email"?setEmail(e.target.value):setPass(e.target.value)}
              placeholder={f==="email"?"tu@email.com":"••••••••"}
              style={{width:"100%",background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",
                borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"inherit",color:"#fff",outline:"none"}}
              onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.12)"}
              onKeyDown={e=>e.key==="Enter"&&(mode==="login"?doLogin():doRegister())}/>
          </div>
        ))}

        {error && <div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",
          borderRadius:8,padding:"8px 12px",marginBottom:12,color:"#fca5a5",fontSize:13}}>{error}</div>}

        <Btn onClick={mode==="login"?doLogin:doRegister} full color="#6366f1" style={{marginTop:4}}>
          {mode==="login"?"Entrar":"Registrarme"}
        </Btn>

        {mode==="login" && <div style={{marginTop:16,padding:"12px",background:"rgba(255,255,255,.05)",borderRadius:10}}>
          <div style={{color:"#a5b4fc",fontSize:11,fontWeight:700,marginBottom:6}}>CUENTAS DEMO</div>
          <div style={{color:"#cbd5e1",fontSize:12}}>Admin: admin@iglesia.com / admin123</div>
          <div style={{color:"#cbd5e1",fontSize:12}}>Padre: maria@email.com / maria123</div>
        </div>}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ParentView({user, children, responsibles, onLogout}){
  const myKids = children.filter(c=>user.childrenIds?.includes(c.id));
  const [selectedKid, setSelectedKid] = useState(myKids[0]||null);
  const [showQR, setShowQR] = useState(false);
  const myResp = responsibles.find(r=>r.userId===user.id);
  const respCode = myResp ? (myResp.id+todayStr()).slice(0,8).toUpperCase() : "";

  useEffect(()=>{ if(myKids.length&&!selectedKid) setSelectedKid(myKids[0]); },[myKids.length]);

  if(myKids.length===0) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
    justifyContent:"center",fontFamily:"'DM Sans',sans-serif",background:"#f0f2f8"}}>
    <div style={{textAlign:"center",padding:32}}>
      <div style={{fontSize:48,marginBottom:12}}>👶</div>
      <div style={{fontFamily:"Syne",fontWeight:800,fontSize:20,color:"#1a1a2e",marginBottom:8}}>Sin niños vinculados</div>
      <div style={{color:"#6b7280",fontSize:14,marginBottom:20}}>Pide al administrador que vincule tu cuenta con tu hijo.</div>
      <Btn onClick={onLogout} outline>Cerrar sesión</Btn>
    </div>
  </div>;

  const kid = selectedKid || myKids[0];
  const g = groupOf(kid);
  const code = dailyCode(kid.id);
  const lastPickup = kid.attendance?.filter(a=>a.type==="checkout").slice(-1)[0];

  return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0f2f8,#e8eaf6)",fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
      *{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

    {/* Header */}
    <div style={{background:"#1a1a2e",padding:"0 16px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:22}}>🕊️</div>
        <div style={{color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:15}}>Iglesia La Hermosa</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{color:"#a5b4fc",fontSize:12}}>Hola, {user.name.split(" ")[0]}</span>
        <button onClick={onLogout} style={{border:"1px solid rgba(255,255,255,.2)",background:"transparent",
          color:"#a5b4fc",borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Salir</button>
      </div>
    </div>

    <div style={{maxWidth:480,margin:"0 auto",padding:"20px 14px",animation:"fadeUp .3s ease"}}>

      {/* Kid selector */}
      {myKids.length>1 && <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto"}}>
        {myKids.map(k=>(
          <button key={k.id} onClick={()=>setSelectedKid(k)} style={{
            background:selectedKid?.id===k.id?"#6366f1":"#fff",
            color:selectedKid?.id===k.id?"#fff":"#374151",
            border:`2px solid ${selectedKid?.id===k.id?"#6366f1":"#e5e7eb"}`,
            borderRadius:99,padding:"6px 16px",fontSize:13,fontWeight:600,
            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {k.name.split(" ")[0]}
          </button>
        ))}
      </div>}

      {/* Kid card */}
      <div style={{background:"#fff",borderRadius:20,padding:"22px",boxShadow:"0 4px 20px #0002",
        marginBottom:16,border:`2px solid ${g.color}20`}}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:18}}>
          <Avatar photo={kid.photo} emoji={g.emoji} color={g.color} size={60}/>
          <div>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:19,color:"#1a1a2e"}}>{kid.name}</div>
            <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
              <Badge group={g}/>
              <Dot on={kid.checkedIn}/>
              <span style={{fontSize:12,color:"#9ca3af"}}>{kid.checkedIn?"Está dentro":"No está dentro"}</span>
            </div>
          </div>
        </div>

        {/* Daily code */}
        <div style={{background:"linear-gradient(135deg,#6366f1,#a78bfa)",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <div style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6}}>CÓDIGO DE HOY</div>
          <div style={{color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:36,letterSpacing:6}}>{code}</div>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:11,marginTop:4}}>
            Válido hoy · {new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}
          </div>
        </div>

        {kid.allergies && <div style={{background:"#fef2f2",borderRadius:10,padding:"10px 14px",
          border:"1.5px solid #fecaca",marginBottom:12,fontSize:13,color:"#dc2626",fontWeight:600}}>
          ⚠️ Alergia: {kid.allergies}
        </div>}

        {kid.notes && <div style={{background:"#f0f9ff",borderRadius:10,padding:"10px 14px",
          border:"1.5px solid #bae6fd",fontSize:13,color:"#0369a1"}}>
          📝 {kid.notes}
        </div>}
      </div>

      {/* Last pickup */}
      <div style={{background:"#fff",borderRadius:16,padding:"18px",boxShadow:"0 2px 10px #0001",marginBottom:16}}>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#1a1a2e",marginBottom:12}}>Última recogida</div>
        {lastPickup ? <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✅</div>
          <div>
            <div style={{fontWeight:600,fontSize:14,color:"#1a1a2e"}}>{lastPickup.by||"Responsable"}</div>
            <div style={{fontSize:12,color:"#6b7280"}}>{timeLabel(lastPickup.at)}</div>
          </div>
        </div> : <div style={{color:"#9ca3af",fontSize:13}}>Sin registro de recogidas aún.</div>}
      </div>

      {/* Attendance history */}
      {kid.attendance?.length>0 && <div style={{background:"#fff",borderRadius:16,padding:"18px",boxShadow:"0 2px 10px #0001",marginBottom:16}}>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#1a1a2e",marginBottom:12}}>Historial reciente</div>
        <div style={{display:"grid",gap:8}}>
          {[...kid.attendance].reverse().slice(0,5).map((a,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",fontSize:13}}>
              <span style={{fontSize:16}}>{a.type==="checkin"?"🟢":"🔵"}</span>
              <div>
                <span style={{fontWeight:600,color:"#1a1a2e"}}>{a.type==="checkin"?"Entrada":"Salida"}</span>
                {a.by&&<span style={{color:"#6b7280"}}> · {a.by}</span>}
              </div>
              <span style={{marginLeft:"auto",color:"#9ca3af",fontSize:11}}>{timeLabel(a.at)}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* Mi QR */}
      {myResp && <div style={{background:"#fff",borderRadius:16,padding:"18px",boxShadow:"0 2px 10px #0001"}}>
        <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#1a1a2e",marginBottom:4}}>Mi código QR</div>
        <div style={{color:"#6b7280",fontSize:12,marginBottom:14}}>Muéstraselo al profesor al recoger a tu hijo</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <QRCanvas value={respCode} size={180}/>
          <div style={{fontFamily:"monospace",fontWeight:800,fontSize:18,color:"#6366f1",letterSpacing:3}}>{respCode}</div>
          <div style={{fontSize:11,color:"#9ca3af"}}>Código válido solo hoy</div>
        </div>
      </div>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════════════════════════════════════════
function AdminView({user, users, setUsers, children, setChildren, responsibles, setResponsibles, onLogout}){
  const [tab,setTab]=useState("dashboard");
  const [search,setSearch]=useState("");
  const [filterG,setFilterG]=useState("all");

  // Modals
  const [addKidOpen,setAddKidOpen]=useState(false);
  const [detailKid,setDetailKid]=useState(null);
  const [addRespOpen,setAddRespOpen]=useState(false); // inside kid detail
  const [checkoutOpen,setCheckoutOpen]=useState(null);
  const [scannerOpen,setScannerOpen]=useState(false);
  const [scanResult,setScanResult]=useState(null);
  const [checkoutKid,setCheckoutKid]=useState(null);

  // Forms
  const emptyKid={name:"",age:"",allergies:"",notes:""};
  const emptyResp={name:"",phone:"",relation:"",userId:""};
  const [kidForm,setKidForm]=useState(emptyKid);
  const [respForm,setRespForm]=useState(emptyResp);

  const checkedIn=children.filter(c=>c.checkedIn).length;
  const filtered=children.filter(c=>{
    const g=groupOf(c);
    return (filterG==="all"||g.id===filterG)&&c.name.toLowerCase().includes(search.toLowerCase());
  });

  function saveKid(){
    if(!kidForm.name||!kidForm.age) return;
    const nk={id:"k"+Date.now(),name:kidForm.name,age:Number(kidForm.age),
      allergies:kidForm.allergies,notes:kidForm.notes,responsibleIds:[],
      checkedIn:false,photo:null,attendance:[]};
    setChildren(p=>[...p,nk]);
    setKidForm(emptyKid); setAddKidOpen(false);
  }

  function saveResp(kidId){
    if(!respForm.name) return;
    const nr={id:"r"+Date.now(),name:respForm.name,phone:respForm.phone,
      relation:respForm.relation,userId:respForm.userId||null};
    setResponsibles(p=>[...p,nr]);
    setChildren(p=>p.map(c=>c.id===kidId?{...c,responsibleIds:[...c.responsibleIds,nr.id]}:c));
    // link to user if userId set
    if(respForm.userId){
      setUsers(p=>p.map(u=>u.id===respForm.userId?{...u,childrenIds:[...(u.childrenIds||[]),kidId]}:u));
    }
    setRespForm(emptyResp); setAddRespOpen(false);
    // refresh detailKid
    setDetailKid(p=>p?{...p,responsibleIds:[...p.responsibleIds,nr.id]}:p);
  }

  function deleteKid(id){
    setChildren(p=>p.filter(c=>c.id!==id));
    setDetailKid(null);
  }
  function deleteResp(rid,kidId){
    setResponsibles(p=>p.filter(r=>r.id!==rid));
    setChildren(p=>p.map(c=>c.id===kidId?{...c,responsibleIds:c.responsibleIds.filter(x=>x!==rid)}:c));
    setDetailKid(p=>p?{...p,responsibleIds:p.responsibleIds.filter(x=>x!==rid)}:p);
  }

  function doCheckIn(id){
    const now=new Date().toISOString();
    setChildren(p=>p.map(c=>c.id===id?{...c,checkedIn:true,attendance:[...(c.attendance||[]),{type:"checkin",at:now,by:user.name}]}:c));
    setDetailKid(p=>p&&p.id===id?{...p,checkedIn:true}:p);
  }

  function openCheckout(child){ setCheckoutKid(child); setScannerOpen(true); setScanResult(null); }

  function handleScan(code){
    // Find responsible by today's code
    const kid=checkoutKid;
    const kidResps=responsibles.filter(r=>kid.responsibleIds.includes(r.id));
    const match=kidResps.find(r=>{
      const rc=(r.id+todayStr()).slice(0,8).toUpperCase();
      return rc===code.toUpperCase()||dailyCode(kid.id)===code.toUpperCase();
    });
    if(match){
      setScanResult({ok:true,name:match.name});
      setTimeout(()=>{
        const now=new Date().toISOString();
        setChildren(p=>p.map(c=>c.id===kid.id?{...c,checkedIn:false,attendance:[...(c.attendance||[]),{type:"checkout",at:now,by:match.name}]}:c));
        setDetailKid(p=>p&&p.id===kid.id?{...p,checkedIn:false}:p);
        setScannerOpen(false); setScanResult(null); setCheckoutKid(null);
      },1800);
    } else {
      setScanResult({ok:false});
      setTimeout(()=>setScanResult(null),2000);
    }
  }

  async function handlePhoto(kidId,file){
    if(!file) return;
    const data=await readFile(file);
    setChildren(p=>p.map(c=>c.id===kidId?{...c,photo:data}:c));
    setDetailKid(p=>p&&p.id===kidId?{...p,photo:data}:p);
  }

  const TABS=[
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"checkin",  label:"✅ Check-in"},
    {id:"children", label:"👦 Niños"},
    {id:"reports",  label:"📋 Reportes"},
  ];

  return <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0f2f8,#e8eaf6)",fontFamily:"'DM Sans',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
      *{box-sizing:border-box} @keyframes modalIn{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:none}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}`}</style>

    {/* Header */}
    <header style={{background:"#1a1a2e",padding:"0 16px",display:"flex",alignItems:"center",
      justifyContent:"space-between",height:58,boxShadow:"0 4px 24px #0003"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#a78bfa)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🕊️</div>
        <div>
          <div style={{color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:15,lineHeight:1}}>Iglesia La Hermosa</div>
          <div style={{color:"#a5b4fc",fontSize:10}}>Ministerio Infantil · Admin</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{background:"#22c55e20",border:"1.5px solid #22c55e50",borderRadius:99,
          padding:"3px 10px",color:"#4ade80",fontSize:12,fontWeight:700}}>
          <Dot on/> {checkedIn} dentro
        </div>
        <button onClick={onLogout} style={{border:"1px solid rgba(255,255,255,.2)",background:"transparent",
          color:"#a5b4fc",borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Salir</button>
      </div>
    </header>

    {/* Nav */}
    <nav style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 14px",display:"flex",gap:2,overflowX:"auto"}}>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",cursor:"pointer",
          padding:"12px 13px",fontSize:13,fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",
          color:tab===t.id?"#6366f1":"#6b7280",
          borderBottom:tab===t.id?"2.5px solid #6366f1":"2.5px solid transparent",transition:"color .15s"}}>
          {t.label}
        </button>
      ))}
    </nav>

    <main style={{maxWidth:960,margin:"0 auto",padding:"22px 12px",animation:"fadeIn .2s ease"}}>

      {/* ── DASHBOARD */}
      {tab==="dashboard" && <div>
        <h1 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#1a1a2e",marginTop:0,marginBottom:20}}>Dashboard</h1>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:22}}>
          {[
            {label:"Niños registrados", value:children.length,                        icon:"👦",color:"#6366f1"},
            {label:"Dentro ahora",      value:checkedIn,                              icon:"✅",color:"#22c55e"},
            {label:"Responsables",      value:responsibles.length,                    icon:"👪",color:"#0ea5e9"},
            {label:"Con alergias",      value:children.filter(c=>c.allergies).length, icon:"⚠️",color:"#ef4444"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:14,padding:"16px",
              boxShadow:"0 2px 10px #0001",borderTop:`3px solid ${s.color}`}}>
              <div style={{fontSize:24}}>{s.icon}</div>
              <div style={{fontSize:28,fontWeight:800,fontFamily:"Syne",color:s.color,lineHeight:1.1,marginTop:5}}>{s.value}</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:20}}>
          {GROUPS.map(g=>{
            const total=children.filter(c=>groupOf(c).id===g.id).length;
            const inside=children.filter(c=>groupOf(c).id===g.id&&c.checkedIn).length;
            return <div key={g.id} style={{background:"#fff",borderRadius:16,padding:"18px",
              boxShadow:"0 2px 10px #0001",border:`2px solid ${g.color}20`}}>
              <div style={{fontSize:32,marginBottom:8}}>{g.emoji}</div>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#1a1a2e"}}>{g.label}</div>
              <div style={{color:"#9ca3af",fontSize:11,marginBottom:10}}>{g.id} años</div>
              <div style={{display:"flex",gap:12,marginBottom:10}}>
                <div><div style={{fontWeight:800,fontSize:18,color:g.color}}>{inside}</div><div style={{fontSize:10,color:"#9ca3af"}}>dentro</div></div>
                <div style={{width:1,background:"#f3f4f6"}}/>
                <div><div style={{fontWeight:800,fontSize:18,color:"#9ca3af"}}>{total}</div><div style={{fontSize:10,color:"#9ca3af"}}>total</div></div>
              </div>
              <div style={{background:"#f3f4f6",borderRadius:99,height:5}}>
                <div style={{background:g.color,borderRadius:99,height:"100%",width:total?`${inside/total*100}%`:"0%",transition:"width .4s"}}/>
              </div>
            </div>;
          })}
        </div>
        {checkedIn>0 && <>
          <h2 style={{fontFamily:"Syne",fontWeight:700,fontSize:16,color:"#1a1a2e",marginBottom:10}}>Dentro ahora 🏠</h2>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {children.filter(c=>c.checkedIn).map(c=>(
              <div key={c.id} style={{background:"#fff",borderRadius:10,padding:"6px 12px 6px 6px",
                display:"flex",alignItems:"center",gap:8,border:"1.5px solid #22c55e20",boxShadow:"0 1px 6px #0001"}}>
                <Avatar photo={c.photo} emoji={groupOf(c).emoji} color={groupOf(c).color} size={28}/>
                <span style={{fontWeight:600,fontSize:13}}>{c.name}</span>
                <Badge group={groupOf(c)}/>
              </div>
            ))}
          </div>
        </>}
      </div>}

      {/* ── CHECK-IN */}
      {tab==="checkin" && <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <h1 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#1a1a2e",margin:0}}>Check-in / Check-out</h1>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar niño..."
          style={{width:"100%",border:"2px solid #e5e7eb",borderRadius:12,padding:"10px 16px",
            fontSize:14,fontFamily:"inherit",marginBottom:16,outline:"none",boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
        <div style={{display:"grid",gap:10}}>
          {filtered.map(child=>{
            const g=groupOf(child);
            const kidResps=responsibles.filter(r=>child.responsibleIds.includes(r.id));
            return <div key={child.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",
              boxShadow:"0 2px 10px #0001",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
              borderLeft:`4px solid ${child.checkedIn?"#22c55e":"#e5e7eb"}`}}>
              <Avatar photo={child.photo} emoji={g.emoji} color={g.color} size={38}/>
              <div style={{flex:1,minWidth:120}}>
                <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{child.name}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                  <Badge group={g}/>
                  {child.allergies&&<span style={{background:"#fef2f2",color:"#ef4444",border:"1.5px solid #fecaca",
                    borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>⚠️ {child.allergies}</span>}
                  {kidResps.length>0&&<span style={{fontSize:11,color:"#6b7280"}}>👪 {kidResps.map(r=>r.name).join(", ")}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                {!child.checkedIn
                  ?<Btn onClick={()=>doCheckIn(child.id)} color="#22c55e" small>✅ Entrada</Btn>
                  :<Btn onClick={()=>openCheckout(child)} color="#ef4444" small>📷 Salida</Btn>}
                <Btn onClick={()=>setDetailKid(child)} outline small>Ver</Btn>
              </div>
            </div>;
          })}
          {filtered.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:"40px 0"}}>Sin resultados</div>}
        </div>
      </div>}

      {/* ── NIÑOS */}
      {tab==="children" && <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
          <h1 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#1a1a2e",margin:0}}>Niños registrados</h1>
          <Btn onClick={()=>{setKidForm(emptyKid);setAddKidOpen(true);}}>+ Registrar niño</Btn>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[{id:"all",label:"Todos",emoji:"👥"},...GROUPS].map(g=>(
            <button key={g.id} onClick={()=>setFilterG(g.id)} style={{
              background:filterG===g.id?"#6366f1":"#fff",color:filterG===g.id?"#fff":"#374151",
              border:`2px solid ${filterG===g.id?"#6366f1":"#e5e7eb"}`,
              borderRadius:99,padding:"5px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar..."
          style={{width:"100%",border:"2px solid #e5e7eb",borderRadius:12,padding:"10px 16px",
            fontSize:14,fontFamily:"inherit",marginBottom:16,outline:"none",boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {filtered.map(child=>{
            const g=groupOf(child);
            const kidResps=responsibles.filter(r=>child.responsibleIds.includes(r.id));
            return <div key={child.id} onClick={()=>setDetailKid(child)} style={{
              background:"#fff",borderRadius:16,padding:"16px",boxShadow:"0 2px 10px #0001",
              cursor:"pointer",border:"2px solid transparent",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=g.color;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.transform="";}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,alignItems:"flex-start"}}>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <Avatar photo={child.photo} emoji={g.emoji} color={g.color} size={40}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{child.name}</div>
                    <div style={{color:"#9ca3af",fontSize:11}}>{child.age} años</div>
                  </div>
                </div>
                <Dot on={child.checkedIn}/>
              </div>
              <Badge group={g}/>
              {kidResps.length>0&&<div style={{marginTop:7,fontSize:12,color:"#6b7280"}}>👪 {kidResps.map(r=>r.name).join(" · ")}</div>}
              {child.allergies&&<div style={{marginTop:7,background:"#fef2f2",borderRadius:7,
                padding:"4px 8px",fontSize:11,color:"#dc2626",fontWeight:600}}>⚠️ {child.allergies}</div>}
              <div style={{marginTop:8,fontSize:11,color:"#6366f1",fontFamily:"monospace",fontWeight:700,letterSpacing:2}}>
                {dailyCode(child.id)}
              </div>
            </div>;
          })}
        </div>
        {filtered.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:"40px 0"}}>Sin niños registrados</div>}
      </div>}

      {/* ── REPORTES */}
      {tab==="reports" && <div>
        <h1 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#1a1a2e",marginTop:0,marginBottom:18}}>Reportes</h1>
        <div style={{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 10px #0001",marginBottom:18}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#1a1a2e"}}>Asistencia del día</span>
            <span style={{fontSize:12,color:"#9ca3af"}}>{checkedIn}/{children.length} presentes</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f9fafb"}}>
                {["Niño","Grupo","Estado","Responsables","Alergias","Código hoy"].map(h=>(
                  <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,
                    color:"#6b7280",letterSpacing:.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{children.map((c,i)=>{
                const rNames=responsibles.filter(r=>c.responsibleIds.includes(r.id)).map(r=>r.name).join(", ");
                return <tr key={c.id} style={{background:i%2?"#fafafa":"#fff",borderBottom:"1px solid #f3f4f6"}}>
                  <td style={{padding:"10px 14px",fontWeight:600,color:"#1a1a2e"}}>{c.name}</td>
                  <td style={{padding:"10px 14px"}}><Badge group={groupOf(c)}/></td>
                  <td style={{padding:"10px 14px"}}>
                    <span style={{background:c.checkedIn?"#dcfce7":"#f3f4f6",color:c.checkedIn?"#16a34a":"#9ca3af",
                      borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700}}>
                      {c.checkedIn?"✅ Dentro":"🔲 Fuera"}
                    </span>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#374151"}}>{rNames||"—"}</td>
                  <td style={{padding:"10px 14px",color:c.allergies?"#dc2626":"#d1d5db",fontSize:12}}>{c.allergies||"—"}</td>
                  <td style={{padding:"10px 14px",fontFamily:"monospace",fontWeight:700,color:"#6366f1",letterSpacing:2,fontSize:12}}>{dailyCode(c.id)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
        {children.filter(c=>c.allergies).length>0&&(
          <div style={{background:"#fef2f2",borderRadius:14,padding:"16px 18px",border:"1.5px solid #fecaca"}}>
            <div style={{fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#dc2626",marginBottom:10}}>⚠️ Alergias</div>
            {children.filter(c=>c.allergies).map(c=>(
              <div key={c.id} style={{display:"flex",gap:10,fontSize:13,marginBottom:5}}>
                <span style={{fontWeight:600,minWidth:140}}>{c.name}</span>
                <span style={{color:"#dc2626",fontWeight:600}}>{c.allergies}</span>
                {c.notes&&<span style={{color:"#6b7280"}}>— {c.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>}
    </main>

    {/* ── SCANNER MODAL */}
    <Modal open={scannerOpen} onClose={()=>{setScannerOpen(false);setScanResult(null);setCheckoutKid(null);}}
      title={`📷 Verificar responsable — ${checkoutKid?.name||""}`}>
      {scanResult ? (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:56}}>{scanResult.ok?"✅":"❌"}</div>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:19,
            color:scanResult.ok?"#22c55e":"#ef4444",marginTop:10}}>
            {scanResult.ok?`¡Autorizado! ${scanResult.name}`:"No autorizado"}
          </div>
          <div style={{color:"#6b7280",marginTop:4,fontSize:13}}>
            {scanResult.ok?"Salida registrada":"Responsable no encontrado"}
          </div>
        </div>
      ) : (
        <QRScanner onScan={handleScan} onClose={()=>{setScannerOpen(false);setCheckoutKid(null);}}/>
      )}
    </Modal>

    {/* ── ADD KID MODAL */}
    <Modal open={addKidOpen} onClose={()=>setAddKidOpen(false)} title="➕ Registrar niño">
      <Field label="Nombre completo" value={kidForm.name} onChange={v=>setKidForm(f=>({...f,name:v}))} placeholder="Ej: Ana García" required/>
      <Field label="Edad" value={kidForm.age} onChange={v=>setKidForm(f=>({...f,age:v}))} placeholder="Ej: 7" type="number" required/>
      <Field label="Alergias" value={kidForm.allergies} onChange={v=>setKidForm(f=>({...f,allergies:v}))} placeholder="Ej: maní, lactosa"/>
      <Field label="Notas especiales" value={kidForm.notes} onChange={v=>setKidForm(f=>({...f,notes:v}))} placeholder="Observaciones para voluntarios..."/>
      <div style={{background:"#f0f9ff",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#0369a1",marginBottom:16}}>
        💡 Después de registrar el niño puedes agregar sus responsables desde su perfil.
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={saveKid} full disabled={!kidForm.name||!kidForm.age}>Registrar niño</Btn>
        <Btn onClick={()=>setAddKidOpen(false)} outline>Cancelar</Btn>
      </div>
    </Modal>

    {/* ── DETAIL KID MODAL */}
    <Modal open={!!detailKid} onClose={()=>{setDetailKid(null);setAddRespOpen(false);}} title="👦 Perfil del niño" wide>
      {detailKid&&(()=>{
        const g=groupOf(detailKid);
        const kidResps=responsibles.filter(r=>detailKid.responsibleIds.includes(r.id));
        const code=dailyCode(detailKid.id);
        return <div>
          {/* Header */}
          <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:18}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
              <label style={{cursor:"pointer"}}>
                <input type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>handlePhoto(detailKid.id,e.target.files[0])}/>
                <div style={{position:"relative",width:64,height:64}}>
                  <Avatar photo={detailKid.photo} emoji={g.emoji} color={g.color} size={64}/>
                  <div style={{position:"absolute",bottom:-4,right:-4,background:"#6366f1",borderRadius:"50%",
                    width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,color:"#fff",boxShadow:"0 2px 6px #6366f150"}}>📷</div>
                </div>
              </label>
              {detailKid.photo&&<button onClick={()=>{setChildren(p=>p.map(c=>c.id===detailKid.id?{...c,photo:null}:c));setDetailKid(p=>({...p,photo:null}));}}
                style={{border:"none",background:"none",color:"#ef4444",fontSize:10,cursor:"pointer",padding:0}}>Quitar</button>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,color:"#1a1a2e"}}>{detailKid.name}</div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                <Badge group={g}/>
                <span style={{fontSize:11,color:"#9ca3af"}}>{detailKid.age} años</span>
                <Dot on={detailKid.checkedIn}/>
              </div>
              {/* Daily code */}
              <div style={{marginTop:10,background:"linear-gradient(135deg,#6366f1,#a78bfa)",
                borderRadius:10,padding:"8px 14px",display:"inline-block"}}>
                <span style={{color:"rgba(255,255,255,.7)",fontSize:10,fontWeight:700}}>CÓDIGO HOY · </span>
                <span style={{color:"#fff",fontFamily:"monospace",fontWeight:800,fontSize:18,letterSpacing:4}}>{code}</span>
              </div>
            </div>
          </div>

          {detailKid.allergies&&<div style={{background:"#fef2f2",borderRadius:10,padding:"9px 12px",
            border:"1.5px solid #fecaca",marginBottom:10,fontSize:13,color:"#dc2626",fontWeight:600}}>
            ⚠️ Alergia: {detailKid.allergies}</div>}
          {detailKid.notes&&<div style={{background:"#f0f9ff",borderRadius:10,padding:"9px 12px",
            border:"1.5px solid #bae6fd",marginBottom:14,fontSize:13,color:"#0369a1"}}>
            📝 {detailKid.notes}</div>}

          {/* Responsibles */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:.5,textTransform:"uppercase"}}>Responsables</div>
              <Btn onClick={()=>setAddRespOpen(true)} small color="#6366f1">+ Agregar</Btn>
            </div>
            {kidResps.length>0?kidResps.map(r=>(
              <div key={r.id} style={{display:"flex",gap:10,alignItems:"center",background:"#f9fafb",
                borderRadius:9,padding:"9px 12px",marginBottom:6}}>
                <div style={{width:36,height:36,borderRadius:9,background:"#ede9fe",display:"flex",
                  alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#1a1a2e"}}>{r.name}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>{r.relation}{r.phone?` · ${r.phone}`:""}</div>
                </div>
                <button onClick={()=>deleteResp(r.id,detailKid.id)} style={{border:"none",background:"none",
                  color:"#d1d5db",cursor:"pointer",fontSize:16,padding:4}}
                  onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
                  onMouseLeave={e=>e.currentTarget.style.color="#d1d5db"}>✕</button>
              </div>
            )):<div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>Sin responsables. Agrega uno arriba.</div>}
          </div>

          {/* Add responsible inline */}
          {addRespOpen&&<div style={{background:"#f5f3ff",borderRadius:12,padding:"14px",border:"1.5px solid #c4b5fd",marginBottom:14}}>
            <div style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#6366f1",marginBottom:10}}>Nuevo responsable</div>
            <Field label="Nombre" value={respForm.name} onChange={v=>setRespForm(f=>({...f,name:v}))} placeholder="Nombre completo" required/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Teléfono" value={respForm.phone} onChange={v=>setRespForm(f=>({...f,phone:v}))} placeholder="555-0000"/>
              <Field label="Relación" value={respForm.relation} onChange={v=>setRespForm(f=>({...f,relation:v}))} placeholder="Mamá / Papá..."/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:5,letterSpacing:.5,textTransform:"uppercase"}}>
                Vincular a cuenta de usuario (opcional)</label>
              <select value={respForm.userId} onChange={e=>setRespForm(f=>({...f,userId:e.target.value}))}
                style={{width:"100%",border:"2px solid #e5e7eb",borderRadius:10,padding:"10px 14px",
                  fontSize:14,fontFamily:"inherit",outline:"none",background:"#fff"}}>
                <option value="">Sin cuenta vinculada</option>
                {users.filter(u=>u.role==="parent").map(u=>(
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>saveResp(detailKid.id)} small disabled={!respForm.name}>Guardar</Btn>
              <Btn onClick={()=>setAddRespOpen(false)} outline small>Cancelar</Btn>
            </div>
          </div>}

          {/* Attendance */}
          {detailKid.attendance?.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>Historial</div>
            {[...detailKid.attendance].reverse().slice(0,6).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,marginBottom:5}}>
                <span>{a.type==="checkin"?"🟢":"🔵"}</span>
                <span style={{fontWeight:600}}>{a.type==="checkin"?"Entrada":"Salida"}</span>
                {a.by&&<span style={{color:"#6b7280"}}>— {a.by}</span>}
                <span style={{marginLeft:"auto",color:"#9ca3af"}}>{timeLabel(a.at)}</span>
              </div>
            ))}
          </div>}

          <div style={{display:"flex",gap:8,paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
            <Btn onClick={()=>{if(!detailKid.checkedIn)doCheckIn(detailKid.id);else openCheckout(detailKid);}}
              color={detailKid.checkedIn?"#ef4444":"#22c55e"} style={{flex:1}}>
              {detailKid.checkedIn?"📷 Check-out":"✅ Check-in"}
            </Btn>
            <Btn onClick={()=>{if(window.confirm("¿Eliminar este niño?"))deleteKid(detailKid.id);}} danger outline small>🗑️</Btn>
          </div>
        </div>;
      })()}
    </Modal>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App(){
  const [users,setUsers]           = useState(()=>load("mi_users",SEED_USERS));
  const [children,setChildren]     = useState(()=>load("mi_children2",SEED_CHILDREN));
  const [responsibles,setResponsibles] = useState(()=>load("mi_resp2",SEED_RESP));
  const [session,setSession]       = useState(()=>load("mi_session",null));

  useEffect(()=>save("mi_users",users),[users]);
  useEffect(()=>save("mi_children2",children),[children]);
  useEffect(()=>save("mi_resp2",responsibles),[responsibles]);
  useEffect(()=>save("mi_session",session),[session]);

  function handleLogin(u){ setSession(u); }
  function handleLogout(){ setSession(null); }
  function handleRegister(u){
    setUsers(p=>[...p,u]);
    setSession(u);
  }

  // Sync session user with updated users list
  const currentUser = session ? (users.find(u=>u.id===session.id)||session) : null;

  if(!currentUser) return <LoginScreen users={users} onLogin={handleLogin} onRegister={handleRegister}/>;

  if(currentUser.role==="parent") return (
    <ParentView user={currentUser} children={children} responsibles={responsibles} onLogout={handleLogout}/>
  );

  return (
    <AdminView user={currentUser} users={users} setUsers={setUsers}
      children={children} setChildren={setChildren}
      responsibles={responsibles} setResponsibles={setResponsibles}
      onLogout={handleLogout}/>
  );
}
