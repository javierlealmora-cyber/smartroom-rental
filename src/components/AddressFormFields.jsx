import { Form, Input, Select, Col, Divider } from "antd";
import { PROVINCIAS_ES } from "../constants/formOptions";

export default function AddressFormFields({ 
  showDivider = true,
  dividerText = "Dirección",
  requiredFields = {
    street: true,
    number: true,
    postal_code: true,
    city: true,
    province: true,
    country: true,
  }
}) {
  return (
    <>
      {showDivider && (
        <Col xs={24}>
          <Divider orientation="left" style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 4px" }}>
            {dividerText}
          </Divider>
        </Col>
      )}
      
      <Col xs={24} md={12}>
        <Form.Item 
          label="Calle / Vía" 
          name="address_street"
          rules={[
            { required: requiredFields.street, message: "Indique la calle" },
            { min: 3, message: "La calle debe tener al menos 3 caracteres" },
            { max: 200, message: "La calle no puede exceder 200 caracteres" }
          ]}
          extra="Ej: Calle Mayor, Avda. de la Constitución, Plaza del Sol..."
        >
          <Input placeholder="Calle, Avenida, Plaza, Paseo..." maxLength={200} />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={4}>
        <Form.Item 
          label="Número" 
          name="address_number"
          rules={[
            { required: requiredFields.number, message: "Indique el número" },
            { max: 10, message: "El número no puede exceder 10 caracteres" }
          ]}
        >
          <Input placeholder="12" maxLength={10} />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={8}>
        <Form.Item 
          label="Piso / Puerta / Escalera" 
          name="address_floor"
          rules={[
            { max: 50, message: "No puede exceder 50 caracteres" }
          ]}
          extra="Ej: 2º A, Escalera B, Bloque 3..."
        >
          <Input placeholder="2º A" maxLength={50} />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={4}>
        <Form.Item 
          label="C.P." 
          name="address_postal_code"
          rules={[
            { required: requiredFields.postal_code, message: "Indique el código postal" },
            { pattern: /^\d{5}$/, message: "Debe ser un código postal válido de 5 dígitos" }
          ]}
        >
          <Input placeholder="28001" maxLength={5} />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={8}>
        <Form.Item 
          label="Ciudad / Municipio" 
          name="address_city"
          rules={[
            { required: requiredFields.city, message: "Indique la ciudad" },
            { min: 2, message: "La ciudad debe tener al menos 2 caracteres" },
            { max: 100, message: "La ciudad no puede exceder 100 caracteres" }
          ]}
        >
          <Input placeholder="Madrid" maxLength={100} />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={6}>
        <Form.Item 
          label="Provincia" 
          name="address_province"
          rules={[
            { required: requiredFields.province, message: "Seleccione la provincia" }
          ]}
        >
          <Select
            showSearch
            placeholder="Seleccionar provincia..."
            optionFilterProp="label"
            options={PROVINCIAS_ES}
          />
        </Form.Item>
      </Col>
      
      <Col xs={24} md={6}>
        <Form.Item 
          label="País" 
          name="address_country"
          rules={[
            { required: requiredFields.country, message: "Indique el país" }
          ]}
        >
          <Input placeholder="España" maxLength={100} />
        </Form.Item>
      </Col>
    </>
  );
}
