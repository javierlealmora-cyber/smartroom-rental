import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, message, Typography } from "antd";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ password }) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      message.error("Error al actualizar la contraseña: " + error.message);
    } else {
      message.success("Contraseña actualizada correctamente");
      navigate("/v2/admin/auth/login", { replace: true });
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "120px auto", padding: 24 }}>
      <Title level={3}>Nueva contraseña</Title>
      <Text type="secondary">Introduce tu nueva contraseña para acceder.</Text>
      <Form layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Form.Item
          name="password"
          label="Nueva contraseña"
          rules={[
            { required: true, message: "Introduce una contraseña" },
            { min: 8, message: "Mínimo 8 caracteres" },
          ]}
          hasFeedback
        >
          <Input.Password placeholder="Mínimo 8 caracteres" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirmar contraseña"
          dependencies={["password"]}
          hasFeedback
          rules={[
            { required: true, message: "Confirma la contraseña" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject("Las contraseñas no coinciden");
              },
            }),
          ]}
        >
          <Input.Password placeholder="Repite la contraseña" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Actualizar contraseña
        </Button>
      </Form>
    </div>
  );
}
