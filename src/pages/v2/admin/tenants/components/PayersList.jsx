import { useState, useEffect } from "react";
import { Button, Card, Form, Input, List, Modal, Radio, Space, Tag, Typography, message } from "antd";
import { PlusOutlined, EditOutlined, CheckCircleOutlined, StopOutlined } from "@ant-design/icons";
import { listPayers, createPayer, updatePayer, togglePayerStatus } from "../../../../../services/payers.service";

const { Text } = Typography;

export default function PayersList({ lodgerId, clientAccountId, hasRoomAssignment = true }) {
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayer, setEditingPayer] = useState(null);
  const [form] = Form.useForm();
  const [payerType, setPayerType] = useState('individual');

  useEffect(() => {
    if (lodgerId && hasRoomAssignment) loadPayers();
  }, [lodgerId, hasRoomAssignment]);

  const loadPayers = async () => {
    setLoading(true);
    try {
      const data = await listPayers(lodgerId);
      setPayers(data);
    } catch (e) {
      message.error(`Error al cargar pagadores: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    if (saving) return; // Prevenir doble submit
    
    setSaving(true);
    try {
      const payload = {
        client_account_id: clientAccountId,
        lodger_id: lodgerId,
        payer_type: values.payer_type,
        first_name: values.payer_type === 'individual' ? values.first_name : null,
        last_name1: values.payer_type === 'individual' ? values.last_name1 : null,
        last_name2: values.payer_type === 'individual' ? values.last_name2 : null,
        legal_name: values.payer_type === 'company' ? values.legal_name : null,
        notes: values.notes || null,
      };

      if (editingPayer) {
        await updatePayer(editingPayer.id, payload, clientAccountId);
        message.success('Pagador actualizado correctamente');
      } else {
        await createPayer(payload);
        message.success('Pagador añadido correctamente');
      }

      await loadPayers();
      setModalOpen(false);
      form.resetFields();
      setEditingPayer(null);
    } catch (e) {
      message.error(`Error al guardar pagador: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async (payer) => {
    try {
      await togglePayerStatus(payer.id, clientAccountId);
      message.success(`Pagador ${payer.is_active ? 'desactivado' : 'activado'} correctamente`);
      loadPayers();
    } catch (e) {
      message.error(`Error al cambiar estado: ${e.message}`);
    }
  };

  const openEditModal = (payer) => {
    setEditingPayer(payer);
    setPayerType(payer.payer_type);
    form.setFieldsValue(payer);
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingPayer(null);
    form.resetFields();
    setPayerType('individual');
    setModalOpen(true);
  };

  if (!hasRoomAssignment) {
    return (
      <Card title="Pagadores" size="small">
        <Alert
          message="Habitación requerida"
          description="El inquilino debe tener una habitación asignada antes de poder añadir pagadores. Por favor, asigna una habitación primero."
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title="Pagadores"
      size="small"
      extra={
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Añadir Pagador
        </Button>
      }
    >
      <List
        loading={loading}
        dataSource={payers}
        locale={{ emptyText: "No hay pagadores registrados" }}
        renderItem={(payer) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(payer)}
              />,
              <Button
                key="toggle"
                size="small"
                icon={payer.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => onToggleStatus(payer)}
              >
                {payer.is_active ? "Desactivar" : "Activar"}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {payer.payer_type === 'individual'
                    ? `${payer.first_name} ${payer.last_name1} ${payer.last_name2 || ''}`
                    : payer.legal_name}
                  <Tag color={payer.is_active ? "green" : "default"}>
                    {payer.is_active ? "Activo" : "Inactivo"}
                  </Tag>
                  <Tag>{payer.payer_type === 'individual' ? "Persona Física" : "Empresa"}</Tag>
                </Space>
              }
              description={payer.notes}
            />
          </List.Item>
        )}
      />

      <Modal
        title={editingPayer ? "Editar Pagador" : "Añadir Pagador"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingPayer(null);
        }}
        onOk={() => form.submit()}
        okText={editingPayer ? "Guardar" : "Añadir"}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ payer_type: 'individual' }}>
          <Form.Item
            label="Tipo de Pagador"
            name="payer_type"
            rules={[{ required: true, message: "Selecciona el tipo" }]}
          >
            <Radio.Group onChange={(e) => setPayerType(e.target.value)}>
              <Radio value="individual">Persona Física</Radio>
              <Radio value="company">Empresa</Radio>
            </Radio.Group>
          </Form.Item>

          {payerType === 'individual' ? (
            <>
              <Form.Item
                label="Nombre"
                name="first_name"
                rules={[{ required: true, message: "El nombre es obligatorio" }]}
              >
                <Input placeholder="Nombre" />
              </Form.Item>
              <Form.Item
                label="Primer Apellido"
                name="last_name1"
                rules={[{ required: true, message: "El primer apellido es obligatorio" }]}
              >
                <Input placeholder="Apellido 1" />
              </Form.Item>
              <Form.Item label="Segundo Apellido" name="last_name2">
                <Input placeholder="Apellido 2 (opcional)" />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              label="Nombre de la Empresa"
              name="legal_name"
              rules={[{ required: true, message: "El nombre de la empresa es obligatorio" }]}
            >
              <Input placeholder="Razón Social" />
            </Form.Item>
          )}

          <Form.Item label="Observaciones" name="notes">
            <Input.TextArea placeholder="Ej: Padre del inquilino, Empresa empleadora..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
