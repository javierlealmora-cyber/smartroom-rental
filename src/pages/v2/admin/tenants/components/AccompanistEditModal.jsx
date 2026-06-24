// src/pages/v2/admin/tenants/components/AccompanistEditModal.jsx
// REQ-015 — Modal de edición de datos personales del acompañante.
// Reutiliza LodgerFormFields con isAccompanist=true. Llama a manage_lodger.update_accompanist.

import { useEffect } from "react";
import { Form, Modal, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import LodgerFormFields from "./LodgerFormFields";
import { updateAccompanist } from "../../../../../services/lodgers.service";

export default function AccompanistEditModal({ open, accompanist, onClose, onSuccess }) {
  const [form] = Form.useForm();

  // Cargar datos del acompañante en el form cada vez que se abre
  useEffect(() => {
    if (open && accompanist) {
      form.setFieldsValue({
        first_name: accompanist.first_name,
        last_name1: accompanist.last_name1,
        last_name2: accompanist.last_name2,
        nickname: accompanist.nickname,
        email: accompanist.email,
        phone: accompanist.phone,
        document_id: accompanist.document_id,
        gender: accompanist.gender,
        address_street: accompanist.address_street,
        address_number: accompanist.address_number,
        address_floor: accompanist.address_floor,
        address_postal_code: accompanist.address_postal_code,
        address_city: accompanist.address_city,
        address_province: accompanist.address_province,
        address_country: accompanist.address_country,
      });
    }
  }, [open, accompanist, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await updateAccompanist(accompanist.id, values);
      message.success("Acompañante actualizado");
      if (onSuccess) await onSuccess();
    } catch (e) {
      if (e?.errorFields) return; // validación antd
      message.error(`Error al actualizar: ${e.message}`);
    }
  };

  return (
    <Modal
      title={<><EditOutlined /> Editar acompañante</>}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      destroyOnHidden
      width={720}
    >
      <Form form={form} layout="vertical">
        <LodgerFormFields isAccompanist dividerText="Dirección del acompañante" />
      </Form>
    </Modal>
  );
}
