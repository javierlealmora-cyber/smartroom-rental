// src/pages/v2/admin/tenants/components/LodgerFormFields.jsx
// Componente compartido para campos del formulario de inquilino
// Usado en TenantCreate.jsx y TenantEdit.jsx para evitar duplicación

import { Col, Form, Input, Row, Select } from "antd";

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

/**
 * section: "personal" | "address" | undefined (all)
 *   "personal" → solo nombre, nickname, email, teléfono, documento, género
 *   "address"  → solo la sección de dirección (Divider + campos)
 *   undefined  → todo (comportamiento original, para TenantEdit y modal edición)
 *
 * REQ-015 · isAccompanist
 *   true → email/phone/last_name2/document_id/gender + toda la dirección pasan a ser OPCIONALES.
 *          Se usa en RoomAssignmentForm cuando se activa el toggle "Habitación compartida".
 *          El acompañante NO es usuario del sistema y su dirección puede coincidir con la del titular.
 * dividerText → permite renombrar el divisor de la sección dirección (p. ej. "Dirección del acompañante").
 */
export default function LodgerFormFields({
  disableEmail = false,
  section,
  isAccompanist = false,
  dividerText = "Dirección",
  namePrefix, // REQ-015: array opcional para anidar los campos, p.ej. ["accompanist"]
}) {
  const showPersonal = !section || section === "personal";
  const showAddress  = !section || section === "address";
  const req = !isAccompanist; // cuando es acompañante, todo lo opcional queda opcional
  // Helper para prefijar nombres de Form.Item cuando se anida (REQ-015)
  const n = (field) =>
    Array.isArray(namePrefix) && namePrefix.length > 0 ? [...namePrefix, field] : field;

  return (
    <>
      {showPersonal && (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Nombre"
                name={n("first_name")}
                rules={[{ required: true, message: "El nombre es obligatorio" }]}
              >
                <Input placeholder="Nombre" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Primer apellido"
                name={n("last_name1")}
                rules={[{ required: true, message: "El primer apellido es obligatorio" }]}
              >
                <Input placeholder="Apellido 1" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Segundo apellido"
                name={n("last_name2")}
                rules={req ? [{ required: true, message: "El segundo apellido es obligatorio" }] : []}
              >
                <Input placeholder="Apellido 2" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="¿Cómo quieres que te llamen?" name={n("nickname")}>
                <Input placeholder="Nombre preferido" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email"
            name={n("email")}
            rules={[
              ...(req ? [{ required: true, message: "El email es obligatorio" }] : []),
              { type: "email", message: "Email inválido" },
            ]}
          >
            <Input placeholder="email@ejemplo.com" disabled={disableEmail} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Teléfono"
                name={n("phone")}
                rules={req ? [{ required: true, message: "El teléfono es obligatorio" }] : []}
              >
                <Input placeholder="+34 600 000 000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Documento (DNI/NIE/Pasaporte)"
                name={n("document_id")}
                rules={req ? [{ required: true, message: "El documento es obligatorio" }] : []}
              >
                <Input placeholder="12345678A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Género"
                name={n("gender")}
                rules={req ? [{ required: true, message: "El género es obligatorio" }] : []}
              >
                <Select options={GENDER_OPTIONS} placeholder="Seleccionar" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {showAddress && (
        <>
          <div style={{ paddingBottom: 8, marginBottom: 16, marginTop: 8, borderBottom: "2px solid #F3F4F6" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {dividerText}
            </span>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                label="Calle"
                name={n("address_street")}
                rules={req ? [{ required: true, message: "La calle es obligatoria" }] : []}
              >
                <Input placeholder="Ej: Calle Mayor" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Número"
                name={n("address_number")}
                rules={req ? [{ required: true, message: "El número es obligatorio" }] : []}
              >
                <Input placeholder="Ej: 12" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Piso / Puerta"
                name={n("address_floor")}
                rules={req ? [{ required: true, message: "El piso/puerta es obligatorio" }] : []}
              >
                <Input placeholder="Ej: 3º B" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Código Postal"
                name={n("address_postal_code")}
                rules={req ? [{ required: true, message: "El código postal es obligatorio" }] : []}
              >
                <Input placeholder="Ej: 28001" maxLength={10} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Localidad"
                name={n("address_city")}
                rules={req ? [{ required: true, message: "La localidad es obligatoria" }] : []}
              >
                <Input placeholder="Ej: Madrid" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Provincia"
                name={n("address_province")}
                rules={req ? [{ required: true, message: "La provincia es obligatoria" }] : []}
              >
                <Input placeholder="Ej: Madrid" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="País"
                name={n("address_country")}
                rules={req ? [{ required: true, message: "El país es obligatorio" }] : []}
              >
                <Input placeholder="España" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </>
  );
}
