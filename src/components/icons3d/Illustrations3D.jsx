// src/components/icons3d/Illustrations3D.jsx
// Elegant 3D-style SVG illustrations — white/grey with color accents

export function IllustrationRoom({ width = 280, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 280 180" fill="none">
      <defs>
        <linearGradient id="rf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F8FAFC"/><stop offset="100%" stopColor="#E2E8F0"/></linearGradient>
        <linearGradient id="rw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F1F5F9"/></linearGradient>
        <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4B896"/><stop offset="100%" stopColor="#A8896C"/></linearGradient>
        <linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F0F4F8"/></linearGradient>
        <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#BFDBFE"/><stop offset="100%" stopColor="#DBEAFE"/></linearGradient>
        <filter id="rs"><feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#64748B" floodOpacity="0.15"/></filter>
      </defs>
      {/* Room walls */}
      <rect x="0" y="0" width="280" height="130" fill="url(#rw)"/>
      <path d="M0 130 L140 90 L280 130 L280 180 L0 180 Z" fill="url(#rf)"/>
      <path d="M0 0 L0 180 L38 150 L38 20 Z" fill="#E2E8F0" opacity="0.4"/>
      <path d="M280 0 L280 180 L242 150 L242 20 Z" fill="#E2E8F0" opacity="0.25"/>
      <path d="M0 130 L140 90 L280 130" stroke="#CBD5E1" strokeWidth="1" fill="none"/>
      {/* Window */}
      <rect x="100" y="14" width="80" height="56" rx="3" fill="url(#rsky)" filter="url(#rs)"/>
      <rect x="100" y="14" width="80" height="56" rx="3" stroke="#E2E8F0" strokeWidth="2" fill="none"/>
      <line x1="140" y1="14" x2="140" y2="70" stroke="#E2E8F0" strokeWidth="1.5"/>
      <line x1="100" y1="42" x2="180" y2="42" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M96 11 Q100 34 98 70 L104 70 Q102 34 106 11 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.5"/>
      <path d="M184 11 Q180 34 182 70 L176 70 Q178 34 174 11 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="0.5"/>
      <rect x="92" y="9" width="96" height="4" rx="2" fill="#CBD5E1"/>
      {/* Bed */}
      <g filter="url(#rs)">
        <path d="M70 155 L70 105 L210 105 L210 155 Z" fill="url(#rb)"/>
        <path d="M70 105 L90 90 L230 90 L210 105 Z" fill="#E8D5BC"/>
        <path d="M210 105 L230 90 L230 140 L210 155 Z" fill="#9E7A58"/>
        <path d="M75 108 L95 93 L225 93 L205 108 Z" fill="#FFFFFF"/>
        <path d="M205 108 L225 93 L225 97 L205 112 Z" fill="#F0F4F8"/>
        <ellipse cx="105" cy="97" rx="18" ry="7" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" transform="rotate(-8 105 97)"/>
        <ellipse cx="155" cy="95" rx="18" ry="7" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" transform="rotate(-8 155 95)"/>
        <path d="M78 108 L78 155 L202 155 L202 108 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5"/>
        <path d="M78 118 Q140 114 202 118" stroke="#E2E8F0" strokeWidth="1" fill="none"/>
        <rect x="70" y="88" width="20" height="20" rx="3" fill="#C8A882"/>
        <path d="M70 88 L90 88 L90 90 L70 90 Z" fill="#E8D5BC"/>
      </g>
      {/* Nightstand left */}
      <g filter="url(#rs)">
        <path d="M35 148 L35 118 L68 118 L68 148 Z" fill="#D4B896"/>
        <path d="M35 118 L42 110 L75 110 L68 118 Z" fill="#E8D5BC"/>
        <path d="M68 118 L75 110 L75 140 L68 148 Z" fill="#A8896C"/>
        <rect x="44" y="100" width="4" height="10" rx="1" fill="#CBD5E1"/>
        <path d="M38 100 L50 100 L47 88 L41 88 Z" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="0.5"/>
        <ellipse cx="44" cy="100" rx="6" ry="2" fill="#FDE68A" opacity="0.5"/>
      </g>
      {/* Nightstand right */}
      <g filter="url(#rs)">
        <path d="M212 148 L212 118 L245 118 L245 148 Z" fill="#D4B896"/>
        <path d="M212 118 L219 110 L252 110 L245 118 Z" fill="#E8D5BC"/>
        <path d="M245 118 L252 110 L252 140 L245 148 Z" fill="#A8896C"/>
        <rect x="224" y="102" width="4" height="8" rx="1" fill="#A8896C"/>
        <circle cx="226" cy="98" r="7" fill="#86EFAC" opacity="0.8"/>
        <circle cx="222" cy="101" r="5" fill="#4ADE80" opacity="0.7"/>
        <circle cx="230" cy="100" r="5" fill="#86EFAC" opacity="0.7"/>
      </g>
      {/* Wall art */}
      <rect x="28" y="24" width="40" height="30" rx="2" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
      <circle cx="48" cy="39" r="8" fill="#BFDBFE" opacity="0.7"/>
      <rect x="212" y="24" width="40" height="30" rx="2" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
      <circle cx="232" cy="39" r="8" fill="#D9F99D" opacity="0.7"/>
    </svg>
  );
}

export function IllustrationAccommodation({ width = 280, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 280 180" fill="none">
      <defs>
        <linearGradient id="asky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EFF6FF"/><stop offset="100%" stopColor="#DBEAFE"/></linearGradient>
        <linearGradient id="agnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D1FAE5"/><stop offset="100%" stopColor="#A7F3D0"/></linearGradient>
        <linearGradient id="awf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F1F5F9"/></linearGradient>
        <linearGradient id="aws" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E2E8F0"/><stop offset="100%" stopColor="#F1F5F9"/></linearGradient>
        <linearGradient id="arf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#059669"/></linearGradient>
        <linearGradient id="ars" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#047857"/><stop offset="100%" stopColor="#059669"/></linearGradient>
        <filter id="as"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#64748B" floodOpacity="0.15"/></filter>
      </defs>
      <rect x="0" y="0" width="280" height="140" fill="url(#asky)"/>
      <path d="M0 140 L280 140 L280 180 L0 180 Z" fill="url(#agnd)"/>
      <ellipse cx="140" cy="155" rx="90" ry="8" fill="#6EE7B7" opacity="0.35"/>
      <g filter="url(#as)">
        <rect x="60" y="75" width="120" height="68" fill="url(#awf)"/>
        <path d="M180 75 L220 60 L220 130 L180 143 Z" fill="url(#aws)"/>
        <path d="M50 75 L140 35 L230 60 L180 75 L60 75 Z" fill="url(#arf)"/>
        <path d="M180 75 L230 60 L230 65 L180 80 Z" fill="url(#ars)"/>
        <path d="M55 74 L140 36 L160 42 L75 78 Z" fill="white" opacity="0.2"/>
        <rect x="115" y="110" width="30" height="33" rx="15" fill="#E2E8F0"/>
        <circle cx="141" cy="127" r="2" fill="#94A3B8"/>
        <rect x="70" y="87" width="30" height="22" rx="3" fill="#BFDBFE" stroke="#E2E8F0" strokeWidth="1.5"/>
        <line x1="85" y1="87" x2="85" y2="109" stroke="#E2E8F0" strokeWidth="1"/>
        <line x1="70" y1="98" x2="100" y2="98" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="160" y="87" width="30" height="22" rx="3" fill="#BFDBFE" stroke="#E2E8F0" strokeWidth="1.5"/>
        <line x1="175" y1="87" x2="175" y2="109" stroke="#E2E8F0" strokeWidth="1"/>
        <line x1="160" y1="98" x2="190" y2="98" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="187" y="74" width="22" height="18" rx="2" fill="#BFDBFE" opacity="0.6" stroke="#E2E8F0" strokeWidth="1"/>
        <rect x="187" y="99" width="22" height="18" rx="2" fill="#BFDBFE" opacity="0.6" stroke="#E2E8F0" strokeWidth="1"/>
      </g>
      <rect x="28" y="120" width="6" height="22" rx="2" fill="#A8896C"/>
      <circle cx="31" cy="112" r="14" fill="#86EFAC" opacity="0.85"/>
      <circle cx="25" cy="118" r="10" fill="#4ADE80" opacity="0.7"/>
      <circle cx="37" cy="116" r="10" fill="#86EFAC" opacity="0.7"/>
      <rect x="240" y="122" width="5" height="20" rx="2" fill="#A8896C"/>
      <circle cx="242" cy="114" r="12" fill="#86EFAC" opacity="0.85"/>
      <ellipse cx="50" cy="25" rx="22" ry="10" fill="white" opacity="0.8"/>
      <ellipse cx="65" cy="20" rx="18" ry="9" fill="white" opacity="0.9"/>
      <ellipse cx="230" cy="30" rx="20" ry="9" fill="white" opacity="0.8"/>
    </svg>
  );
}

export function IllustrationEntity({ width = 280, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 280 180" fill="none">
      <defs>
        <linearGradient id="esky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EFF6FF"/><stop offset="100%" stopColor="#E0F2FE"/></linearGradient>
        <linearGradient id="egnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F1F5F9"/><stop offset="100%" stopColor="#E2E8F0"/></linearGradient>
        <linearGradient id="ewf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="100%" stopColor="#F8FAFC"/></linearGradient>
        <linearGradient id="ews" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#E2E8F0"/><stop offset="100%" stopColor="#F1F5F9"/></linearGradient>
        <linearGradient id="etop" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BFDBFE"/><stop offset="100%" stopColor="#93C5FD"/></linearGradient>
        <filter id="es"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#64748B" floodOpacity="0.12"/></filter>
      </defs>
      <rect x="0" y="0" width="280" height="135" fill="url(#esky)"/>
      <path d="M0 135 L280 135 L280 180 L0 180 Z" fill="url(#egnd)"/>
      <g filter="url(#es)">
        <rect x="70" y="45" width="110" height="95" fill="url(#ewf)"/>
        <path d="M180 45 L230 30 L230 125 L180 140 Z" fill="url(#ews)"/>
        <path d="M70 45 L120 30 L230 30 L180 45 Z" fill="url(#etop)"/>
        <path d="M72 45 L122 31 L145 31 L95 45 Z" fill="white" opacity="0.4"/>
        {[0,1,2].map(c => [0,1,2,3].map(r => (
          <rect key={`${c}${r}`} x={82+c*32} y={55+r*20} width="20" height="13" rx="2"
            fill={r===1&&c===1?"#FEF3C7":"#BFDBFE"} stroke="#E2E8F0" strokeWidth="0.8" opacity="0.85"/>
        )))}
        {[0,1].map(c => [0,1,2].map(r => (
          <rect key={`s${c}${r}`} x={188+c*22} y={38+r*25} width="14" height="16" rx="2"
            fill="#BFDBFE" stroke="#E2E8F0" strokeWidth="0.8" opacity="0.5"/>
        )))}
        <rect x="115" y="115" width="20" height="25" rx="2" fill="#E2E8F0"/>
        <rect x="135" y="115" width="20" height="25" rx="2" fill="#E2E8F0"/>
        <rect x="113" y="113" width="44" height="4" rx="2" fill="#CBD5E1"/>
        <rect x="108" y="138" width="54" height="4" rx="1" fill="#CBD5E1"/>
        <rect x="90" y="48" width="70" height="12" rx="2" fill="#3B82F6" opacity="0.12"/>
        <rect x="93" y="50" width="40" height="3" rx="1.5" fill="#3B82F6" opacity="0.35"/>
      </g>
      <g opacity="0.65">
        <rect x="15" y="80" width="55" height="58" fill="#F8FAFC"/>
        <path d="M15 80 L42 65 L70 80 Z" fill="#E2E8F0"/>
        {[0,1].map(c => [0,1,2].map(r => (
          <rect key={`lb${c}${r}`} x={22+c*22} y={88+r*16} width="14" height="10" rx="1.5" fill="#BFDBFE" opacity="0.7"/>
        )))}
      </g>
      <ellipse cx="45" cy="18" rx="20" ry="9" fill="white" opacity="0.9"/>
      <ellipse cx="60" cy="13" rx="16" ry="8" fill="white" opacity="0.8"/>
      <ellipse cx="220" cy="15" rx="18" ry="8" fill="white" opacity="0.9"/>
    </svg>
  );
}

export function IllustrationTenant({ width = 280, height = 180 }) {
  return (
    <img
      src="/icons/inquilino-icono-model.png"
      alt="Inquilino"
      width={width}
      height={height}
      style={{ objectFit: "contain", display: "block" }}
    />
  );
}
