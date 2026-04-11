// src/components/AccommodationCard.jsx
// Tarjeta de alojamiento unificada — usada en AccommodationsList y EntityDetail

import { useState } from "react";
import { Button, Progress, Typography } from "antd";

const { Text } = Typography;

const ACC_IMAGE = "/images/Alojamiento Dashboard.png";

const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", archived: "Archivado" };
const STATUS_COLOR = { active: "#16A34A", inactive: "#DC2626", archived: "#6B7280" };
const STATUS_BG    = { active: "#DCFCE7", inactive: "#FEE2E2", archived: "#F3F4F6" };

function getStats(acc) {
  const rooms = acc.rooms || [];
  const total    = rooms.length;
  const occupied = rooms.filter((r) => r.derivedStatus === "occupied").length;
  const free     = rooms.filter((r) => r.derivedStatus === "free").length;
  const pending  = rooms.filter((r) => r.derivedStatus === "pending_checkout").length;
  const rate     = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { total, occupied, free, pending, rate };
}

/**
 * AccommodationCard — tarjeta compartida de alojamiento
 *
 * Props:
 *   accommodation  — objeto con { id, name, status, address_line1, street, postal_code, city, rooms[] }
 *   onCardClick    — acción al hacer clic en la card / imagen
 *   onEdit         — acción botón "Editar"
 *   onServices     — acción botón "Servicios"
 *   onRooms        — acción botón "Habitaciones"
 */
export default function AccommodationCard({
  accommodation: acc,
  onCardClick,
  onEdit,
  onServices,
  onRooms,
}) {
  const [hovered, setHovered] = useState(false);

  const { total, occupied, free, pending, rate } = getStats(acc);
  const progressColor = rate > 80 ? "#059669" : rate > 50 ? "#F59E0B" : "#DC2626";
  const isActive = acc.status === "active";

  const addressLine1 = [acc.address_line1 || acc.street, acc.street_number].filter(Boolean).join(" ");
  const addressLine2 = [acc.postal_code, acc.city].filter(Boolean).join(" – ") || "";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
        boxShadow: hovered
          ? "0 12px 32px rgba(0,0,0,0.13)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        overflow: "hidden",
        opacity: isActive ? 1 : 0.78,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onCardClick}
    >
      {/* ── 1: Cabecera — nombre + dirección ── */}
      <div style={{ padding: "16px 16px 6px" }}>
        <Text strong style={{
          fontSize: 15,
          color: "#1D1D1F",
          letterSpacing: "-0.3px",
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: "2.6em",   /* siempre reserva 2 líneas */
        }}>
          {acc.name}
        </Text>
        {addressLine1 ? (
          <Text style={{ fontSize: 12, color: "#6B7280", display: "block", lineHeight: 1.5, marginTop: 4 }}>
            {addressLine1}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: "#9CA3AF", display: "block", lineHeight: 1.4 }}>
          {addressLine2 || (!addressLine1 ? "Sin dirección" : "")}
        </Text>
      </div>

      {/* ── 2: Imagen full-width con badge estado superpuesto ── */}
      <div
        style={{ position: "relative", background: "#fff", overflow: "hidden" }}
        onClick={(e) => { e.stopPropagation(); onRooms?.(); }}
      >
        <img
          src={ACC_IMAGE}
          alt="Alojamiento"
          style={{
            width: "100%",
            display: "block",
            objectFit: "contain",
            height: 216,
            transform: "scale(1.32)",
            filter: "none",
          }}
        />
        {/* Badge estado — esquina superior derecha */}
        <span style={{
          position: "absolute",
          top: 10,
          right: 12,
          fontSize: 11,
          fontWeight: 700,
          color: STATUS_COLOR[acc.status] || "#6B7280",
          background: STATUS_BG[acc.status] || "#F3F4F6",
          borderRadius: 20,
          padding: "2px 10px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
          zIndex: 2,
        }}>
          {STATUS_LABEL[acc.status] || acc.status}
        </span>
      </div>

      {/* ── 3: KPIs en fila horizontal ── */}
      <div style={{ padding: "12px 16px 0", display: "flex", gap: 0 }}>
        {[
          { v: total,    l: "Total",   c: "#374151" },
          { v: occupied, l: "Ocupado", c: "#DC2626" },
          { v: free,     l: "Libres",  c: "#16A34A" },
          { v: pending,  l: "Pend.",   c: "#D97706" },
        ].map(({ v, l, c }, i) => (
          <div key={l} style={{ flex: 1, textAlign: i === 0 ? "left" : "center" }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", lineHeight: 1.3 }}>{l}</Text>
            <Text style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1.1 }}>{v}</Text>
          </div>
        ))}
      </div>

      {/* ── 4: Barra de ocupación ── */}
      <div style={{ padding: "8px 16px 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Ocupación</Text>
          <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{rate}%</Text>
        </div>
        <Progress
          percent={rate}
          showInfo={false}
          strokeColor={progressColor}
          size="small"
          trailColor="#E5E7EB"
        />
      </div>

      {/* ── 5: Botones ── */}
      <div style={{ height: 1, background: "#F3F4F6", margin: "8px 0 0" }} />
      <div
        style={{ padding: "10px 16px 14px", display: "flex", gap: 8, alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="primary"
          size="small"
          style={{ borderRadius: 20, fontWeight: 600, fontSize: 12, flex: 1, background: "#0096D6", borderColor: "#0096D6" }}
          onClick={() => onEdit?.()}
        >
          Editar
        </Button>
        <Button
          type="primary"
          size="small"
          style={{ borderRadius: 20, fontWeight: 600, fontSize: 12, flex: 1, background: "#0096D6", borderColor: "#0096D6" }}
          onClick={() => onServices?.()}
        >
          Servicios
        </Button>
        <Button
          type="primary"
          size="small"
          style={{ borderRadius: 20, fontWeight: 600, fontSize: 12, flex: 1, background: "#0096D6", borderColor: "#0096D6" }}
          onClick={() => onRooms?.()}
        >
          Habitaciones
        </Button>
      </div>
    </div>
  );
}
