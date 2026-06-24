// src/pages/v2/admin/tenants/components/AccompanistSection.jsx
// REQ-015 — Sección "Acompañante" para TenantDetail.
// Cabecera siempre visible con el nombre + collapse ghost con los datos detallados.
// Respeta el patrón Section/DataRow del resto de TenantDetail.

import { useState } from "react";
import { Button, Collapse, Modal, Tag, Typography, Input, Form, message } from "antd";
import { EditOutlined, DeleteOutlined, DownOutlined, UpOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import AccompanistEditModal from "./AccompanistEditModal";
import { removeAccompanist } from "../../../../../services/lodgers.service";

const { Text } = Typography;

const GENDER_LABEL = { male: "Masculino", female: "Femenino", other: "Otro" };
const DOC_LABEL = { dni: "DNI", nie: "NIE", passport: "Pasaporte", other: "Otro" };

// Fila de dato idéntica al DataRow de TenantDetail (no podemos importarla)
function DataRow({ label, value }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline",
      padding: "9px 0",
      borderBottom: "1px solid #F3F4F6",
    }}>
      <span style={{ width: 120, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>
        {value || "-"}
      </span>
    </div>
  );
}

function buildAddress(a) {
  const parts = [
    [a.address_street, a.address_number].filter(Boolean).join(" "),
    a.address_floor,
    [a.address_postal_code, a.address_city].filter(Boolean).join(" "),
    a.address_province,
    a.address_country,
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Props
 *  - accompanist: registro de lodger_accompanists (o null si no hay)
 *  - historical: true si la asignación está cerrada (modo read-only)
 *  - isSuperadmin: controla visibilidad del botón Eliminar
 *  - onChanged: callback tras editar o eliminar (recargar detalle)
 */
export default function AccompanistSection({ accompanist, historical = false, isSuperadmin = false, onChanged }) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removing, setRemoving] = useState(false);

  if (!accompanist) return null;

  const fullName = [accompanist.first_name, accompanist.last_name1, accompanist.last_name2]
    .filter(Boolean).join(" ");

  const handleRemove = async () => {
    if (removeReason.trim().length < 10) {
      message.error("El motivo debe tener al menos 10 caracteres");
      return;
    }
    setRemoving(true);
    try {
      await removeAccompanist(accompanist.id, removeReason.trim());
      message.success("Acompañante eliminado");
      setRemoveOpen(false);
      setRemoveReason("");
      if (onChanged) await onChanged();
    } catch (e) {
      message.error(`Error al eliminar: ${e.message}`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Cabecera de sección (misma estética que Section de TenantDetail) */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 4, paddingBottom: 8, borderBottom: "2px solid #F3F4F6",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          <TeamOutlined style={{ marginRight: 6 }} />
          Acompañante
          {historical && <Tag style={{ marginLeft: 8 }}>Histórico</Tag>}
        </span>
        {!historical && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setEditOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6366F1", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              <EditOutlined style={{ fontSize: 11 }} /> Editar
            </button>
            {isSuperadmin && (
              <button
                onClick={() => setRemoveOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#DC2626", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
              >
                <DeleteOutlined style={{ fontSize: 11 }} /> Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cabecera siempre visible: nombre + toggle collapse */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((s) => !s)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((s) => !s); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", cursor: "pointer",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{fullName}</div>
          {accompanist.nickname && (
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>&ldquo;{accompanist.nickname}&rdquo;</div>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
          {expanded ? "Ocultar datos" : "Ver datos"}
          {expanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
        </span>
      </div>

      {expanded && (
        <div style={{ paddingTop: 4 }}>
          <DataRow
            label="Documento"
            value={accompanist.document_id
              ? `${DOC_LABEL[accompanist.document_type] || ""} · ${accompanist.document_id}`.trim()
              : null}
          />
          <DataRow label="Género" value={GENDER_LABEL[accompanist.gender] || null} />
          <DataRow
            label="Fecha nac."
            value={accompanist.birth_date ? dayjs(accompanist.birth_date).format("DD/MM/YYYY") : null}
          />
          <DataRow label="Nacionalidad" value={accompanist.nationality} />
          <DataRow label="Email" value={accompanist.email} />
          <DataRow label="Teléfono" value={accompanist.phone} />
          <DataRow
            label="Dirección"
            value={buildAddress(accompanist) || "Misma del titular"}
          />
        </div>
      )}

      {/* Modal Editar */}
      <AccompanistEditModal
        open={editOpen}
        accompanist={accompanist}
        onClose={() => setEditOpen(false)}
        onSuccess={async () => {
          setEditOpen(false);
          if (onChanged) await onChanged();
        }}
      />

      {/* Modal Eliminar — solo superadmin */}
      <Modal
        title={<><DeleteOutlined /> Eliminar acompañante</>}
        open={removeOpen}
        onCancel={() => { setRemoveOpen(false); setRemoveReason(""); }}
        onOk={handleRemove}
        okText="Eliminar"
        okButtonProps={{ danger: true, loading: removing, disabled: removeReason.trim().length < 10 }}
        cancelText="Cancelar"
        width={520}
      >
        <Text type="warning" style={{ display: "block", marginBottom: 12 }}>
          Esta acción marca al acompañante como inactivo y lo desvincula de la asignación activa.
          El histórico se preserva. Requiere motivo auditado.
        </Text>
        <Form layout="vertical">
          <Form.Item
            label={<span>Motivo <Text type="secondary" style={{ fontSize: 11 }}>(mínimo 10 caracteres)</Text></span>}
            required
            validateStatus={removeReason.length > 0 && removeReason.trim().length < 10 ? "error" : ""}
            help={removeReason.length > 0 && removeReason.trim().length < 10 ? "Mínimo 10 caracteres" : null}
          >
            <Input.TextArea
              rows={3}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Ej: Error de captura — la persona registrada no es el acompañante real."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
