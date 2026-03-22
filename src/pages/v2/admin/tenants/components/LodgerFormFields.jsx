// src/pages/v2/admin/tenants/components/LodgerFormFields.jsx
// Componente compartido para campos del formulario de inquilino
// Usado en TenantCreate.jsx y TenantEdit.jsx para evitar duplicación

import { Col, Form, Input, Row, Select } from "antd";

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
    </>
  );
}
