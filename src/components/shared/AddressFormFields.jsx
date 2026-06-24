// src/components/shared/AddressFormFields.jsx
// Componente compartido para campos de dirección
// Usado en formularios de Accommodation y Entity

import { Col, Form, Input, Row, Select } from "antd";
import { PROVINCIAS_ES } from "../../constants/formOptions";

export default function AddressFormFields({ 
  showCountry = true,
  requiredFields = []
}) {
  const isRequired = (field) => requiredFields.includes(field);

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label="Calle"
            name="address_street"
            rules={isRequired('address_street') ? [{ required: true, message: "La calle es obligatoria" }] : []}
          >
            <Input placeholder="Calle Principal" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={6}>
          <Form.Item label="Número" name="address_number">
            <Input placeholder="123" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={6}>
          <Form.Item label="Piso / Puerta" name="address_floor">
            <Input placeholder="2A" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Código postal"
            name="address_postal_code"
            rules={isRequired('address_postal_code') ? [{ required: true, message: "El código postal es obligatorio" }] : []}
          >
            <Input placeholder="28001" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Ciudad"
            name="address_city"
            rules={isRequired('address_city') ? [{ required: true, message: "La ciudad es obligatoria" }] : []}
          >
            <Input placeholder="Madrid" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item label="Provincia" name="address_province">
            <Select
              showSearch
              placeholder="Seleccionar provincia..."
              optionFilterProp="label"
              options={PROVINCIAS_ES}
              allowClear
            />
          </Form.Item>
        </Col>
      </Row>

      {showCountry && (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="País" name="address_country">
              <Input placeholder="España" />
            </Form.Item>
          </Col>
        </Row>
      )}
    </>
  );
}
