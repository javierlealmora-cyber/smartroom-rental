// src/pages/v2/admin/DashboardAdminV3.jsx
// Dashboard Admin v3 — todo sobre el mismo fondo, sin paneles

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";
import AccommodationSelectorModal from "../../../components/modals/AccommodationSelectorModal";

dayjs.locale("es");

// ─── Utils ─────────────────────────────────────────────────────────────────────
const fEur = v => Number(v||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const timeAgo = iso => {
  const s = Math.floor((Date.now()-new Date(iso))/1000);
  return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:s<86400?`${Math.floor(s/3600)}h`:`${Math.floor(s/86400)}d`;
};

// ─── Responsive ────────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w,setW] = useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const h=()=>setW(window.innerWidth);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return w;
}

// ─── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  bg:        "#FFFFFF",
  text:      "#1A2438",
  muted:     "#8A9BB8",
  light:     "#C0CCD8",
  divider:   "rgba(0,0,0,0.07)",
  green:     "#16A34A",
  greenAccent:"#22C55E",
  indigo:    "#4F46E5",
  indigoAccent:"#818CF8",
  teal:      "#0891B2",
  tealAccent:"#22D3EE",
  amber:     "#D97706",
  red:       "#DC2626",
};

// ─── Divider ───────────────────────────────────────────────────────────────────
function HR() {
  return <div style={{height:1, background:C.divider, margin:"32px 0"}}/>;
}

// ─── Etiqueta de sección ───────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:10, fontWeight:800, color:C.light,
      letterSpacing:"0.14em", textTransform:"uppercase",
      marginBottom:18,
    }}>
      {children}
    </div>
  );
}

// ─── KPI grande ────────────────────────────────────────────────────────────────
function KpiBig({ label, value, color, loading }) {
  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.light,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>
        {label}
      </div>
      <div style={{fontSize:32,fontWeight:900,letterSpacing:"-1px",lineHeight:1,color:loading?C.light:(color||C.text)}}>
        {loading?"—":value}
      </div>
    </div>
  );
}

// ─── Fila de métrica con barra ─────────────────────────────────────────────────
function MetricRow({ label, value, unit, pct, color }) {
  return (
    <div style={{marginBottom:28}}>
      <div style={{fontSize:10,fontWeight:800,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>
        {label}
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:8}}>
        <span style={{fontSize:26,fontWeight:900,color,letterSpacing:"-0.5px"}}>{value}</span>
        {unit && <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{unit}</span>}
      </div>
      <div style={{position:"relative",height:5,background:"rgba(0,0,0,0.08)",borderRadius:6,overflow:"hidden"}}>
        <div style={{
          position:"absolute",left:0,top:0,height:"100%",
          background:color,borderRadius:6,
          width:`${Math.min(100,Math.max(0,pct))}%`,
          transition:"width 1.2s ease",
        }}/>
      </div>
      <div style={{fontSize:10,color:C.muted,marginTop:4,textAlign:"right"}}>{Math.round(pct)}%</div>
    </div>
  );
}

// ─── Fila de alerta ────────────────────────────────────────────────────────────
function AlertRow({ icon, label, value, color, last, onClick }) {
  const has = value > 0;
  return (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 0",
      borderBottom: last ? "none" : `1px solid ${C.divider}`,
      cursor: onClick ? "pointer" : "default",
    }}>
      <span style={{fontSize:15}}>{icon}</span>
      <span style={{flex:1, fontSize:12, color:C.muted}}>{label}</span>
      <span style={{fontSize:14,fontWeight:900,color:has?color:C.greenAccent}}>
        {has ? value : "✓"}
      </span>
    </div>
  );
}

// ─── Item de actividad ─────────────────────────────────────────────────────────
const ACT_COLORS = {
  create:"#22C55E",update:"#22D3EE",delete:"#EF4444",
  invite:"#818CF8",checkout:"#F59E0B",settle:"#22D3EE",
  publish:"#818CF8",reassign_room:"#0891B2",
};
const ACT_LABEL = {
  create:"Creado",update:"Actualizado",delete:"Eliminado",
  invite:"Invitado",checkout:"Checkout",settle:"Liquidado",
  publish:"Publicado",reassign_room:"Reasignado",
};
const ENT_LABEL = {
  accommodation:"Alojamiento",room:"Habitación",lodger:"Inquilino",
  entity:"Entidad",service:"Servicio",energy_bill:"Factura",bulletin:"Boletín",
};

function ActivityItem({ item, isLast }) {
  const color  = ACT_COLORS[item.action] || C.muted;
  const label  = ACT_LABEL[item.action]  || item.action;
  const entity = ENT_LABEL[item.entity_type] || item.entity_type;
  const v      = item.new_values||item.old_values||{};
  const name   = v.full_name||v.name||v.legal_name||v.number||"";

  return (
    <div style={{display:"flex",gap:12,paddingBottom:isLast?0:14}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:color,marginTop:3}}/>
        {!isLast && <div style={{width:1,flex:1,background:C.divider,marginTop:4}}/>}
      </div>
      <div style={{flex:1,minWidth:0,paddingBottom:isLast?0:4}}>
        <div style={{fontSize:12,color:C.text,lineHeight:1.4}}>
          <span style={{fontWeight:700,color}}>{label}</span>
          {" "}{entity}{name?`: ${name}`:""}
        </div>
        <div style={{fontSize:10,color:C.muted,marginTop:2}}>
          {item.actorName||item.actor_role||"Sistema"} · {timeAgo(item.created_at)}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN
// =============================================================================
export default function DashboardAdminV3() {
  const navigate = useNavigate();
  const { role:_r } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const vw       = useBreakpoint();
  const isMobile = vw < 768;
  const isTablet = vw < 1100;

  const [stats,setStats]       = useState(null);
  const [loading,setLoading]   = useState(true);
  const [activity,setActivity] = useState([]);
  const [actLoad,setActLoad]   = useState(true);
  const [accName,setAccName]   = useState("");
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);

  const load = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [
        {data:acc},
        {data:rm},
        {data:assgn},
        {data:lodgers},
        {data:aRent},
        {data:buls},
        {data:bills},
        {data:drafts},
      ] = await Promise.all([
        supabase.from("accommodations").select("id,name,city").eq("client_account_id",clientAccountId).eq("status","active").limit(1).single(),
        supabase.from("rooms").select("id,is_maintenance").eq("client_account_id",clientAccountId),
        supabase.from("lodger_room_assignments").select("room_id,move_out_date").eq("client_account_id",clientAccountId)
          .or(`move_out_date.is.null,move_out_date.gt.${today}`),
        supabase.from("profiles").select("id,onboarding_status").eq("role","lodger").eq("client_account_id",clientAccountId),
        supabase.from("lodger_room_assignments").select("monthly_rent").eq("client_account_id",clientAccountId).is("move_out_date",null),
        supabase.from("bulletins").select("id,amount_total").eq("client_account_id",clientAccountId).eq("status","published"),
        supabase.from("energy_bills").select("id").eq("client_account_id",clientAccountId).in("status",["pending","validated"]),
        supabase.from("bulletins").select("id").eq("client_account_id",clientAccountId).eq("status","draft"),
      ]);

      const allRooms = rm||[];
      const byRoom = {};
      (assgn||[]).forEach(a=>{ byRoom[a.room_id]=a; });
      let free=0, occ=0, pchk=0;
      allRooms.forEach(r=>{
        if(r.is_maintenance) return;
        const a = byRoom[r.id];
        if(!a) free++; else if(!a.move_out_date) occ++; else pchk++;
      });

      const monthlyIncome = (aRent||[]).reduce((s,a)=>s+Number(a.monthly_rent||0),0);
      const pendAmt = (buls||[]).reduce((s,b)=>s+Number(b.amount_total||0),0);

      setAccName(acc?.name || acc?.city || "Alojamiento");
      setStats({
        totalRooms:allRooms.length, free, occ, pchk,
        activeTenants:(lodgers||[]).filter(l=>l.onboarding_status==="active").length,
        monthlyIncome,
        collectedIncome: monthlyIncome - pendAmt,
        pendAmt,
        unprocessedBills:(bills||[]).length,
        draftBulletins:(drafts||[]).length,
        occRate: allRooms.length>0 ? Math.round((occ/allRooms.length)*100) : 0,
      });
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  },[clientAccountId]);

  const loadActivity = useCallback(async () => {
    if (!clientAccountId) return;
    setActLoad(true);
    try {
      const {data} = await supabase.from("audit_log")
        .select("id,entity_type,action,actor_role,actor_user_id,new_values,old_values,created_at")
        .eq("client_account_id",clientAccountId).order("created_at",{ascending:false}).limit(8);
      if (!data?.length){setActivity([]);return;}
      const ids=[...new Set(data.map(d=>d.actor_user_id).filter(Boolean))];
      const {data:actors}=ids.length?await supabase.from("profiles").select("id,full_name").in("id",ids):{data:[]};
      const map=Object.fromEntries((actors||[]).map(a=>[a.id,a.full_name]));
      setActivity(data.map(i=>({...i,actorName:map[i.actor_user_id]||null})));
    } catch{setActivity([]);}
    finally{setActLoad(false);}
  },[clientAccountId]);

  useEffect(()=>{load();loadActivity();},[load,loadActivity]);

  const s        = stats;
  const occRate  = s?.occRate ?? 0;
  const occColor = occRate>70?C.green:occRate>40?C.amber:C.red;
  const collectPct = s?.monthlyIncome>0 ? (s.collectedIncome/s.monthlyIncome)*100 : 0;
  const pendPct    = s?.monthlyIncome>0 ? (s.pendAmt/s.monthlyIncome)*100 : 0;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* ── Fondo único, sin sub-paneles ── */}
      <div style={{
        background: C.bg,
        minHeight:"100%",
        margin:-24,
        padding: isMobile?"20px 18px 56px":"28px 44px 56px",
        paddingTop: isMobile?20:0,
        boxSizing:"border-box",
      }}>
        <div style={{maxWidth:1360, margin:"0 auto"}}>

          {/* ══════════════════════════════════════════════
              HEADER
          ══════════════════════════════════════════════ */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28,flexWrap:"wrap"}}>
            <h1 style={{fontSize:19,fontWeight:800,color:C.text,margin:0,letterSpacing:"-0.3px",flexShrink:0}}>
              {accName||"Alojamiento"}
            </h1>

            {/* Pills */}
            {[
              {label:"Habitaciones", val:s?.totalRooms??"—", color:C.indigoAccent, bg:"#EEF2FF"},
              {label:"Inquilinos",   val:s?.activeTenants??"—", color:C.greenAccent, bg:"#F0FDF4"},
              {label:"Ocupación",    val:s?`${occRate}%`:"—",  color:C.tealAccent,  bg:"#ECFEFF"},
            ].map((p,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:5,
                background:p.bg, borderRadius:30, padding:"4px 12px",
              }}>
                <span style={{fontSize:11,fontWeight:600,color:p.color}}>{p.label}</span>
                <span style={{fontSize:11,fontWeight:900,color:"#fff",background:p.color,borderRadius:20,padding:"1px 7px"}}>
                  {p.val}
                </span>
              </div>
            ))}

            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>navigate("/v2/admin/dashboard")} style={{
                background:"none",border:"none",cursor:"pointer",
                fontSize:12,fontWeight:600,color:C.muted,padding:"4px 0",
              }}>← Dashboard</button>
              <button onClick={()=>{load();loadActivity();}} style={{
                background:"none",border:"none",cursor:"pointer",
                fontSize:18,color:C.indigoAccent,padding:4,lineHeight:1,
              }} title="Actualizar">↻</button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              CUERPO: KPIs izq | Imagen centro | Info der
          ══════════════════════════════════════════════ */}
          <div style={{
            display:"grid",
            gridTemplateColumns: isMobile?"1fr":isTablet?"1fr 1fr":"200px 1fr 260px",
            gap: isMobile?24:36,
            marginBottom:36,
            alignItems:"start",
          }}>

            {/* ── COLUMNA IZQUIERDA — KPIs ──────────── */}
            {!isMobile && (
              <div style={{display:"flex",flexDirection:"column",gap:30,paddingTop:40}}>
                <KpiBig label="Ocupación"     value={`${occRate}%`}             color={occColor}    loading={loading}/>
                <KpiBig label="Renta mensual" value={fEur(s?.monthlyIncome??0)} color={C.indigo}    loading={loading}/>
                <KpiBig label="Inquilinos"    value={s?.activeTenants??"—"}      color={C.teal}      loading={loading}/>
                <KpiBig label="Hab. libres"   value={s?.free??"—"}              color={C.muted}     loading={loading}/>
              </div>
            )}

            {/* ── CENTRO — Imagen alojamiento ──────── */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              {/* KPIs mobile */}
              {isMobile && (
                <div style={{display:"flex",gap:24,marginBottom:20,flexWrap:"wrap",justifyContent:"center"}}>
                  <KpiBig label="Ocupación"  value={`${occRate}%`}             color={occColor} loading={loading}/>
                  <KpiBig label="Renta/mes"  value={fEur(s?.monthlyIncome??0)} color={C.indigo} loading={loading}/>
                  <KpiBig label="Inquilinos" value={s?.activeTenants??"—"}      color={C.teal}   loading={loading}/>
                </div>
              )}

              <img
                src="/images/Alojamiento Dashboard.png"
                alt="Plano del alojamiento"
                style={{
                  width:"74%",
                  maxWidth:"74%",
                  objectFit:"contain",
                  display:"block",
                  marginLeft:"-20%",
                  marginTop:"-110px",
                }}
              />

              {/* Estado de habitaciones — puntos bajo la imagen */}
              <div style={{display:"flex",gap:20,marginTop:"-7%",justifyContent:"center",flexWrap:"wrap"}}>
                {[
                  {label:"Ocupadas", val:s?.occ??"—",  color:C.greenAccent},
                  {label:"Libres",   val:s?.free??"—", color:C.light},
                  {label:"Checkout", val:s?.pchk??"—", color:C.amber},
                ].map((it,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:it.color}}/>
                    <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{it.label}</span>
                    <span style={{fontSize:13,fontWeight:900,color:it.color}}>{it.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── COLUMNA DERECHA — Fecha + alertas + actividad ── */}
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {/* Fecha */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>
                  {dayjs().format("dddd D MMMM")}
                </div>
                <div style={{fontSize:11,color:C.muted}}>{dayjs().format("YYYY")}</div>
              </div>

              {/* Alertas */}
              <AlertRow icon="🔔" label="Boletines pdte."  value={s?.draftBulletins??0}   color={C.indigoAccent} onClick={()=>navigate("/v2/admin/boletines")}/>
              <AlertRow icon="⚡" label="Facturas sin rep." value={s?.unprocessedBills??0} color={C.red}          onClick={()=>navigate("/v2/admin/energia/facturas")}/>
              <AlertRow icon="📅" label="Check-outs próx." value={s?.pchk??0}             color={C.amber}        last onClick={()=>navigate("/v2/admin/inquilinos")}/>
            </div>
          </div>

          <HR/>

          {/* ══════════════════════════════════════════════
              FILA INFERIOR — Métricas con barra
          ══════════════════════════════════════════════ */}
          <div style={{
            display:"grid",
            gridTemplateColumns: isMobile?"1fr":isTablet?"1fr 1fr":"1fr 1fr 1fr 1fr",
            gap: isMobile?8:40,
          }}>
            <MetricRow
              label="Renta mensual"
              value={fEur(s?.collectedIncome??0)}
              unit={`de ${fEur(s?.monthlyIncome??0)}`}
              pct={collectPct}
              color={C.greenAccent}
            />
            <MetricRow
              label="Pendiente cobro"
              value={fEur(s?.pendAmt??0)}
              unit="boletines publicados"
              pct={pendPct}
              color={C.indigoAccent}
            />
            <MetricRow
              label="Ocupación habitaciones"
              value={`${s?.occ??0}/${s?.totalRooms??0}`}
              unit="hab."
              pct={occRate}
              color={C.tealAccent}
            />
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Check-outs</div>
                <div style={{fontSize:32,fontWeight:900,color:s?.pchk>0?C.amber:C.muted}}>{s?.pchk??"—"}</div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Alertas</div>
                <div style={{fontSize:32,fontWeight:900,color:((s?.unprocessedBills??0)+(s?.draftBulletins??0))>0?C.red:C.muted}}>
                  {s?(s.unprocessedBills+s.draftBulletins):"—"}
                </div>
              </div>
            </div>
          </div>

          <HR/>

          {/* ══════════════════════════════════════════════
              ACCESOS RÁPIDOS
          ══════════════════════════════════════════════ */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {label:"Nueva Factura",    icon:"⚡",action:()=>setShowAccommodationModal(true)},
              {label:"Nuevo Inquilino",  icon:"👤",path:"/v2/admin/inquilinos/nuevo"},
              {label:"Nuevo Boletín",    icon:"🔔",path:"/v2/admin/boletines/nuevo"},
              {label:"Alojamientos",     icon:"🏠",path:"/v2/admin/alojamientos"},
              {label:"Liquidaciones",    icon:"📑",path:"/v2/admin/energia/liquidaciones"},
            ].map((item,i)=>(
              <button key={i} onClick={()=>item.action?item.action():navigate(item.path)} style={{
                background:"none",
                border:`1px solid ${C.divider}`,
                borderRadius:10, padding:"7px 14px",
                cursor:"pointer",
                display:"flex",alignItems:"center",gap:6,
                fontSize:12,fontWeight:600,color:C.muted,
                transition:"color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.color=C.text;e.currentTarget.style.borderColor="rgba(0,0,0,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.divider;}}
              >
                <span style={{fontSize:13}}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <HR/>

          {/* ══════════════════════════════════════════════
              ACTIVIDAD RECIENTE
          ══════════════════════════════════════════════ */}
          <SectionLabel>Actividad reciente</SectionLabel>
          <div style={{
            display:"grid",
            gridTemplateColumns: isMobile?"1fr":isTablet?"1fr 1fr":"1fr 1fr 1fr",
            gap:isMobile?8:40,
          }}>
            {actLoad ? (
              <div style={{fontSize:12,color:C.muted}}>Cargando…</div>
            ) : activity.length===0 ? (
              <div style={{fontSize:12,color:C.muted}}>Sin actividad</div>
            ) : (
              activity.slice(0,9).map((item,i)=>(
                <ActivityItem key={item.id} item={item} isLast={true}/>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Modal de selección de alojamiento */}
      <AccommodationSelectorModal 
        open={showAccommodationModal} 
        onCancel={() => setShowAccommodationModal(false)} 
      />
    </V2Layout>
  );
}
