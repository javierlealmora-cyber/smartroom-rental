// src/pages/v2/admin/tenants/components/LodgerFormFields.jsx
// Componente compartido para campos del formulario de inquilino
// Usado en TenantCreate.jsx y TenantEdit.jsx para evitar duplicación

import { Col, Divider, Form, Input, Row, Select } from "antd";

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
];

export default function LodgerFormFields({ disableEmail = false }) {
  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Nombre"
            name="first_name"
            rules={[{ required: true, message: "El nombre es obligatorio" }]}
          >
            <Input placeholder="Nombre" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Primer apellido"
            name="last_name1"
            rules={[{ required: true, message: "El primer apellido es obligatorio" }]}
          >
            <Input placeholder="Apellido 1" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Segundo apellido"
            name="last_name2"
            rules={[{ required: true, message: "El segundo apellido es obligatorio" }]}
          >
            <Input placeholder="Apellido 2" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item label="¿Cómo quieres que te llamen?" name="nickname">
            <Input placeholder="Nombre preferido" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "El email es obligatorio" },
          { type: "email", message: "Email inválido" },
        ]}
      >
        <Input placeholder="email@ejemplo.com" disabled={disableEmail} />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Teléfono"
            name="phone"
            rules={[{ required: true, message: "El teléfono es obligatorio" }]}
          >
            <Input placeholder="+34 600 000 000" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Documento (DNI/NIE/Pasaporte)"
            name="document_id"
            rules={[{ required: true, message: "El documento es obligatorio" }]}
          >
            <Input placeholder="12345678A" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Género"
            name="gender"
            rules={[{ required: true, message: "El género es obligatorio" }]}
          >
            <Select options={GENDER_OPTIONS} placeholder="Seleccionar" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 16px" }}>
        Dirección
      </Divider>

      <Row gutter={16}>
        <Col xs={24} sm={16}>
          <Form.Item 
            label="Calle" 
            name="address_street"
            rules={[{ required: true, message: "La calle es obligatoria" }]}
          >
            <Input placeholder="Ej: Calle Mayor" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item 
            label="Número" 
            name="address_number"
            rules={[{ required: true, message: "El número es obligatorio" }]}
          >
            <Input placeholder="Ej: 12" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item 
            label="Piso / Puerta" 
            name="address_floor"
            rules={[{ required: true, message: "El piso/puerta es obligatorio" }]}
          >
            <Input placeholder="Ej: 3º B" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item 
            label="Código Postal" 
            name="address_postal_code"
            rules={[{ required: true, message: "El código postal es obligatorio" }]}
          >
            <Input placeholder="Ej: 28001" maxLength={10} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item 
            label="Localidad" 
            name="address_city"
            rules={[{ required: true, message: "La localidad es obligatoria" }]}
          >
            <Input placeholder="Ej: Madrid" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item 
            label="Provincia" 
            name="address_province"
            rules={[{ required: true, message: "La provincia es obligatoria" }]}
          >
            <Input placeholder="Ej: Madrid" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item 
            label="País" 
            name="address_country"
            rules={[{ required: true, message: "El país es obligatorio" }]}
          >
            <Input placeholder="España" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
