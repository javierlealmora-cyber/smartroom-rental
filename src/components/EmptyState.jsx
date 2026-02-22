// src/components/EmptyState.jsx
// Componente reutilizable de estado vacío con icono, título, descripción y acción

import { Button, Typography } from "antd";

const { Text } = Typography;

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
    }}>
      {icon && (
        <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
      )}
      <Text strong style={{ fontSize: 16, display: "block", marginBottom: 6 }}>
        {title}
      </Text>
      {description && (
        <Text type="secondary" style={{ display: "block", marginBottom: actionLabel ? 20 : 0 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button type="primary" onClick={onAction} style={{ marginTop: 4 }}>
          + {actionLabel}
        </Button>
      )}
    </div>
  );
}
