// src/components/icons3d/NavIcons3D.jsx
// 3D-style icons — PNG images from /icons/ + SVG fallbacks

function ImgIcon({ src, alt, size }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}

export function Icon3DDashboard({ size = 44 }) {
  return <ImgIcon src="/icons/panelcontrol-icono-model.png" alt="Dashboard" size={size} />;
}

export function Icon3DEntidades({ size = 44 }) {
  return <ImgIcon src="/icons/entidad-icono-model.png" alt="Entidades" size={size} />;
}

export function Icon3DAlojamientos({ size = 44 }) {
  return <ImgIcon src="/icons/alojamiento-icono-model.png" alt="Alojamientos" size={size} />;
}

export function Icon3DInquilinos({ size = 44 }) {
  return <ImgIcon src="/icons/habitacion-icono-model.png" alt="Inquilinos" size={size} />;
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
  return <ImgIcon src="/icons/energia-icono-model.png" alt="Facturas" size={size} />;
}

export function Icon3DLiquidaciones({ size = 44 }) {
  return <ImgIcon src="/icons/energia-icono-model.png" alt="Liquidaciones" size={size} />;
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
  return <ImgIcon src="/icons/panelcontrol-icono-model.png" alt="Mi Panel" size={size} />;
}

export function Icon3DIncidencias({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <filter id="sh-inc" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1D1D1F" floodOpacity="0.18"/></filter>
        <linearGradient id="g-inc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#D1D1D6"/></linearGradient>
        <linearGradient id="g-inc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F2F2F7"/><stop offset="100%" stopColor="#AEAEB2"/></linearGradient>
      </defs>
      <g filter="url(#sh-inc)">
        <path d="M22 5 L39 35 H5 Z" fill="url(#g-inc)" stroke="#C8C8CC" strokeWidth="0.5"/>
        <path d="M22 5 L39 35 L22 35 Z" fill="url(#g-inc2)" opacity="0.5"/>
        <path d="M22 6 L37 34 L35 34 L22 8 Z" fill="white" opacity="0.3"/>
        <rect x="20.5" y="16" width="3" height="10" rx="1.5" fill="#636366" opacity="0.8"/>
        <circle cx="22" cy="30" r="2" fill="#636366" opacity="0.8"/>
      </g>
    </svg>
  );
}

export function Icon3DConsumo({ size = 44 }) {
  return <ImgIcon src="/icons/energia-icono-model.png" alt="Consumo" size={size} />;
}
