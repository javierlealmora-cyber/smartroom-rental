// src/components/icons3d/NavIcons3D.jsx
// 3D-style SVG icons — monochrome white/grey/black with grey drop shadow (Apple style)

export function Icon3DDashboard({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-dash" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/>
        </filter>
        <linearGradient id="g-da" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#C8C8CC"/></linearGradient>
        <linearGradient id="g-db" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E5E5EA"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
        <linearGradient id="g-dc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-dd" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8E8E93"/><stop offset="100%" stopColor="#636366"/></linearGradient>
      </defs>
      <g filter="url(#sh-dash)">
        <rect x="5" y="5" width="15" height="15" rx="4" fill="url(#g-da)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="24" y="5" width="15" height="15" rx="4" fill="url(#g-db)" stroke="#AEAEB2" strokeWidth="0.5"/>
        <rect x="5" y="24" width="15" height="15" rx="4" fill="url(#g-dc)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="24" y="24" width="15" height="15" rx="4" fill="url(#g-dd)" stroke="#636366" strokeWidth="0.5"/>
        <rect x="6" y="6" width="7" height="3" rx="1.5" fill="white" opacity="0.7"/>
        <rect x="25" y="6" width="7" height="3" rx="1.5" fill="white" opacity="0.4"/>
        <rect x="6" y="25" width="7" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="25" y="25" width="7" height="3" rx="1.5" fill="white" opacity="0.25"/>
      </g>
    </svg>
  );
}

const ENTIDAD_ICONO_URL = "https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent/entidad-icono-model.png";

export function Icon3DEntidades({ size = 44 }) {
  return (
    <img
      src={ENTIDAD_ICONO_URL}
      alt="Entidades"
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}

export function Icon3DAlojamientos({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-aloj" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-ar" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#C8C8CC"/></linearGradient>
        <linearGradient id="g-aw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#E5E5EA"/></linearGradient>
        <linearGradient id="g-as2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8E8E93"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-aloj)">
        <path d="M22 7 L38 17 L22 17 Z" fill="url(#g-ar)"/>
        <path d="M22 7 L6 17 L22 17 Z" fill="#E5E5EA"/>
        <rect x="6" y="17" width="16" height="17" fill="url(#g-aw)" stroke="#D1D1D6" strokeWidth="0.5"/>
        <path d="M22 17 L38 17 L38 34 L22 34 Z" fill="url(#g-as2)" stroke="#AEAEB2" strokeWidth="0.5"/>
        <rect x="12" y="26" width="6" height="8" rx="3" fill="#8E8E93" opacity="0.6"/>
        <rect x="8" y="20" width="5" height="5" rx="1.5" fill="white" opacity="0.7"/>
        <rect x="25" y="20" width="5" height="5" rx="1.5" fill="white" opacity="0.4"/>
        <path d="M22 8 L36 16.5 L34 16.5 L22 9.5 Z" fill="white" opacity="0.3"/>
      </g>
    </svg>
  );
}

export function Icon3DInquilinos({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-inq" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-ih" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-ib" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E5E5EA"/><stop offset="100%" stopColor="#8E8E93"/></linearGradient>
      </defs>
      <g filter="url(#sh-inq)">
        <circle cx="22" cy="15" r="8" fill="url(#g-ih)" stroke="#D1D1D6" strokeWidth="0.5"/>
        <ellipse cx="19" cy="12" rx="3" ry="2" fill="white" opacity="0.5"/>
        <path d="M10 38 C10 28 14 24 22 24 C30 24 34 28 34 38 Z" fill="url(#g-ib)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M12 38 C12 30 15 26 20 25 L20 27 C16 28 14 32 14 38 Z" fill="white" opacity="0.25"/>
        <circle cx="19" cy="14" r="1.2" fill="#636366" opacity="0.5"/>
        <circle cx="25" cy="14" r="1.2" fill="#636366" opacity="0.5"/>
        <path d="M19 18 Q22 20 25 18" stroke="#636366" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5"/>
      </g>
    </svg>
  );
}

export function Icon3DServicios({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-serv" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-sv" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
        <linearGradient id="g-sv2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#636366"/></linearGradient>
      </defs>
      <g filter="url(#sh-serv)">
        <circle cx="22" cy="22" r="9" fill="url(#g-sv)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <circle cx="22" cy="22" r="4.5" fill="url(#g-sv2)"/>
        <rect x="20" y="8" width="4" height="6" rx="2" fill="url(#g-sv)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="20" y="30" width="4" height="6" rx="2" fill="url(#g-sv)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="8" y="20" width="6" height="4" rx="2" fill="url(#g-sv)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="30" y="20" width="6" height="4" rx="2" fill="url(#g-sv)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <circle cx="20" cy="19" r="2" fill="white" opacity="0.4"/>
      </g>
    </svg>
  );
}

export function Icon3DCatalogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-cat" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-ct" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-ct2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-cat)">
        <path d="M10 8 L10 36 L14 38 L14 10 Z" fill="#636366"/>
        <rect x="14" y="8" width="20" height="28" rx="2" fill="url(#g-ct)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M10 8 L14 8 L34 8 L34 10 L14 10 L10 10 Z" fill="url(#g-ct2)"/>
        <rect x="18" y="14" width="12" height="2" rx="1" fill="#8E8E93" opacity="0.6"/>
        <rect x="18" y="19" width="9" height="1.5" rx="0.75" fill="#8E8E93" opacity="0.4"/>
        <rect x="18" y="23" width="10" height="1.5" rx="0.75" fill="#8E8E93" opacity="0.4"/>
        <rect x="18" y="27" width="7" height="1.5" rx="0.75" fill="#8E8E93" opacity="0.4"/>
        <rect x="15" y="9" width="8" height="3" rx="1" fill="white" opacity="0.4"/>
      </g>
    </svg>
  );
}

export function Icon3DFacturas({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-fact" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-fc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
      </defs>
      <g filter="url(#sh-fact)">
        <rect x="12" y="12" width="22" height="26" rx="3" fill="#AEAEB2" opacity="0.3" transform="translate(2,2)"/>
        <rect x="12" y="12" width="22" height="26" rx="3" fill="#C8C8CC" opacity="0.35" transform="translate(1,1)"/>
        <rect x="10" y="8" width="22" height="26" rx="3" fill="url(#g-fc)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <text x="21" y="26" textAnchor="middle" fontSize="13" fontWeight="700" fill="#636366" opacity="0.9" fontFamily="system-ui">€</text>
        <rect x="14" y="14" width="14" height="2" rx="1" fill="#8E8E93" opacity="0.4"/>
        <rect x="14" y="29" width="10" height="1.5" rx="0.75" fill="#8E8E93" opacity="0.3"/>
        <rect x="11" y="9" width="9" height="3" rx="1" fill="white" opacity="0.4"/>
      </g>
    </svg>
  );
}

export function Icon3DLiquidaciones({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-liq" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-lq" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#C8C8CC"/></linearGradient>
        <linearGradient id="g-lq2" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#8E8E93"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-liq)">
        <rect x="7" y="26" width="7" height="10" rx="2" fill="url(#g-lq)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M7 26 L10.5 23 L14 26 L14 28 L10.5 25 L7 28 Z" fill="white" opacity="0.7"/>
        <path d="M14 26 L17.5 23 L17.5 36 L14 36 Z" fill="#8E8E93" opacity="0.5"/>
        <rect x="19" y="18" width="7" height="18" rx="2" fill="url(#g-lq2)" stroke="#AEAEB2" strokeWidth="0.5"/>
        <path d="M19 18 L22.5 15 L26 18 L26 20 L22.5 17 L19 20 Z" fill="white" opacity="0.5"/>
        <path d="M26 18 L29.5 15 L29.5 36 L26 36 Z" fill="#636366" opacity="0.4"/>
        <rect x="31" y="12" width="7" height="24" rx="2" fill="url(#g-lq)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M31 12 L34.5 9 L38 12 L38 14 L34.5 11 L31 14 Z" fill="white" opacity="0.7"/>
        <rect x="8" y="27" width="3" height="2" rx="1" fill="white" opacity="0.5"/>
        <rect x="20" y="19" width="3" height="2" rx="1" fill="white" opacity="0.4"/>
        <rect x="32" y="13" width="3" height="2" rx="1" fill="white" opacity="0.5"/>
      </g>
    </svg>
  );
}

export function Icon3DBoletines({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-bol" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-bl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#C8C8CC"/></linearGradient>
        <linearGradient id="g-bl2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-bol)">
        <rect x="6" y="12" width="32" height="22" rx="3" fill="url(#g-bl)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M6 12 L22 22 L38 12 Z" fill="url(#g-bl2)"/>
        <path d="M6 34 L18 24" stroke="#AEAEB2" strokeWidth="0.8" opacity="0.5"/>
        <path d="M38 34 L26 24" stroke="#AEAEB2" strokeWidth="0.8" opacity="0.5"/>
        <path d="M7 13 L22 22.5 L24 21.5 L9 12 Z" fill="white" opacity="0.4"/>
        <circle cx="33" cy="11" r="5" fill="#636366"/>
        <text x="33" y="14.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">!</text>
      </g>
    </svg>
  );
}

export function Icon3DCuentas({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-ctas" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-cta" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-cta2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E5E5EA"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-ctas)">
        <rect x="8" y="16" width="28" height="18" rx="4" fill="#AEAEB2" opacity="0.3" transform="translate(2,3)"/>
        <rect x="8" y="16" width="28" height="18" rx="4" fill="#C8C8CC" opacity="0.35" transform="translate(1,1.5)"/>
        <rect x="6" y="12" width="28" height="18" rx="4" fill="url(#g-cta)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <rect x="6" y="17" width="28" height="5" fill="#8E8E93" opacity="0.25"/>
        <rect x="10" y="24" width="7" height="5" rx="1.5" fill="url(#g-cta2)"/>
        <circle cx="26" cy="26.5" r="1.5" fill="#8E8E93" opacity="0.5"/>
        <circle cx="30" cy="26.5" r="1.5" fill="#8E8E93" opacity="0.5"/>
        <rect x="7" y="13" width="10" height="2.5" rx="1" fill="white" opacity="0.4"/>
      </g>
    </svg>
  );
}

export function Icon3DPlanes({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-plan" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
        <linearGradient id="g-pl2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E5E5EA"/><stop offset="100%" stopColor="#636366"/></linearGradient>
      </defs>
      <g filter="url(#sh-plan)">
        <path d="M22 6 L25.5 15 L35 15 L27.5 21 L30 30 L22 25 L14 30 L16.5 21 L9 15 L18.5 15 Z" fill="url(#g-pl)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M22 6 L25.5 15 L22 15 Z" fill="url(#g-pl2)" opacity="0.6"/>
        <path d="M22 7 L24.5 14 L23 14 L22 8 Z" fill="white" opacity="0.5"/>
        <ellipse cx="22" cy="34" rx="8" ry="2" fill="#8E8E93" opacity="0.15"/>
      </g>
    </svg>
  );
}

export function Icon3DMiPanel({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-mip" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-mp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-mp2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8E8E93"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-mip)">
        <path d="M22 6 L38 18 L34 18 L34 36 L10 36 L10 18 L6 18 Z" fill="url(#g-mp)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M22 6 L38 18 L22 18 Z" fill="url(#g-mp2)" opacity="0.5"/>
        <rect x="18" y="26" width="8" height="10" rx="4" fill="#8E8E93" opacity="0.6"/>
        <rect x="12" y="20" width="7" height="6" rx="1.5" fill="white" opacity="0.7"/>
        <rect x="25" y="20" width="7" height="6" rx="1.5" fill="white" opacity="0.7"/>
        <path d="M22 7 L36 17.5 L34 17.5 L22 8.5 Z" fill="white" opacity="0.3"/>
      </g>
    </svg>
  );
}

export function Icon3DConsumo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-con" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-co" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
        <linearGradient id="g-co2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E5E5EA"/><stop offset="100%" stopColor="#636366"/></linearGradient>
      </defs>
      <g filter="url(#sh-con)">
        <path d="M22 6 L28 18 L38 18 L30 26 L33 38 L22 31 L11 38 L14 26 L6 18 L16 18 Z" fill="url(#g-co)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M22 8 L27 18 L22 18 Z" fill="url(#g-co2)" opacity="0.5"/>
        <path d="M22 8 L24.5 16 L23 16 L22 9 Z" fill="white" opacity="0.4"/>
        <circle cx="22" cy="22" r="5" fill="white" opacity="0.25"/>
      </g>
    </svg>
  );
}
