// src/components/shared/EntityFormFields.jsx
// Componente compartido para campos de entidad (persona física/jurídica)
// Usado en EntityCreate.jsx y EntityEdit.jsx

import { Col, Form, Input, Row, Select } from "antd";
import { GENDER_OPTIONS, LEGAL_TYPES } from "../../constants/formOptions";

export default function EntityFormFields({ 
  legalType = "persona_juridica",
  showLegalTypeSelector = true 
}) {
  const isCompany = legalType === "persona_juridica";
  const isPhysical = legalType === "persona_fisica" || legalType === "autonomo";

  return (
    <>
      {showLegalTypeSelector && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Tipo legal"
              name="legal_type"
              rules={[{ required: true, message: "Seleccione el tipo legal" }]}
            >
              <Select options={LEGAL_TYPES} />
            </Form.Item>
          </Col>
        </Row>
      )}

      {isCompany ? (
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              label="Nombre"
              name="legal_name"
              rules={[
                { required: true, message: "Indique el nombre de la empresa" },
                { min: 2, message: "El nombre debe tener al menos 2 caracteres" },
                { max: 200, message: "El nombre no puede exceder 200 caracteres" }
              ]}
            >
              <Input placeholder="Paloma" />
            </Form.Item>
          </Col>
        </Row>
      ) : (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Nombre"
                name="first_name"
                rules={[
                  { required: true, message: "Indique el nombre" },
                  { min: 2, message: "El nombre debe tener al menos 2 caracteres" },
                  { max: 50, message: "El nombre no puede exceder 50 caracteres" },
                  { pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, message: "Solo se permiten letras" }
                ]}
              >
                <Input placeholder="Nombre" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Apellido 1"
                name="last_name1"
                rules={[
                  { required: true, message: "Indique el primer apellido" },
                  { min: 2, message: "El apellido debe tener al menos 2 caracteres" },
                  { max: 50, message: "El apellido no puede exceder 50 caracteres" },
                  { pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, message: "Solo se permiten letras" }
                ]}
              >
                <Input placeholder="Garrido" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item 
                label="Apellido 2" 
                name="last_name2"
                rules={[
                  { max: 50, message: "El apellido no puede exceder 50 caracteres" },
                  { pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/, message: "Solo se permiten letras" }
                ]}
              >
                <Input placeholder="Montes" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item 
                label="Nombre preferido" 
                name="nickname"
                rules={[
                  { max: 50, message: "El nombre preferido no puede exceder 50 caracteres" }
                ]}
              >
                <Input placeholder="Palo" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Género" name="gender">
                <Select options={GENDER_OPTIONS} placeholder="Seleccionar" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={isCompany ? "CIF/NIF" : "DNI/NIE"}
            name="tax_id"
            rules={[
              { required: true, message: "El documento es obligatorio" },
              { 
                pattern: isCompany 
                  ? /^[A-Z]\d{8}$|^\d{8}[A-Z]$/ 
                  : /^\d{8}[A-Z]$|^[XYZ]\d{7}[A-Z]$/,
                message: isCompany 
                  ? "Formato CIF/NIF inválido (ej: B12345678 o 12345678A)" 
                  : "Formato DNI/NIE inválido (ej: 12345678A o X1234567A)"
              },
              { min: 9, max: 9, message: "Debe tener exactamente 9 caracteres" }
            ]}
          >
            <Input placeholder={isCompany ? "B12345678" : "12345678A"} maxLength={9} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Email de facturación"
            name="billing_email"
            rules={[
              { required: true, message: "El email de facturación es obligatorio" },
              { type: "email", message: "Email inválido" },
              { max: 100, message: "El email no puede exceder 100 caracteres" }
            ]}
          >
            <Input placeholder="billing@basicrentals1.com" type="email" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item 
            label="Teléfono" 
            name="phone"
            rules={[
              { pattern: /^\+?[0-9\s-]{9,15}$/, message: "Formato de teléfono inválido" },
              { max: 20, message: "El teléfono no puede exceder 20 caracteres" }
            ]}
          >
            <Input placeholder="+3460000" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
