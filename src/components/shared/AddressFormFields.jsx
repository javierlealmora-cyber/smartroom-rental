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
            label="Dirección (línea 1)"
            name="address_line1"
            rules={isRequired('address_line1') ? [{ required: true, message: "La dirección es obligatoria" }] : []}
          >
            <Input placeholder="Calle Principal 123" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label="Dirección (línea 2)" name="address_line2">
            <Input placeholder="Piso 2, Puerta A" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Código postal"
            name="postal_code"
            rules={isRequired('postal_code') ? [{ required: true, message: "El código postal es obligatorio" }] : []}
          >
            <Input placeholder="28001" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            label="Ciudad"
            name="city"
            rules={isRequired('city') ? [{ required: true, message: "La ciudad es obligatoria" }] : []}
          >
            <Input placeholder="Madrid" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item label="Provincia" name="province">
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
            <Form.Item label="País" name="country">
              <Input placeholder="España" />
            </Form.Item>
          </Col>
        </Row>
      )}
    </>
  );
}
