import Button from "../components/Button";
import Badge from "../components/Badge";
import HeaderPage from "../components/HeaderPage";

export default function GestionInquilinos() {
  const INQUILINOS = [
    {
      id: 1,
      nombre: "Ana López",
      habitacion: "2A",
      estado: "Activo",
    },
    {
      id: 2,
      nombre: "Mario Pérez",
      habitacion: "1C",
      estado: "Pendiente",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Cabecera */}
      <HeaderPage
        title="Gestión de Inquilinos"
        actions={
          <Button variant="primary">
            Nuevo inquilino
          </Button>
        }
      />

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Habitación</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {INQUILINOS.map((inquilino) => (
              <tr key={inquilino.id} className="border-t">
                <td className="px-4 py-3">{inquilino.nombre}</td>
                <td className="px-4 py-3">{inquilino.habitacion}</td>
                <td className="px-4 py-3">
                  <Badge status={inquilino.estado} />
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button className="text-blue-600 hover:underline">
                    Ver
                  </button>
                  <button className="text-gray-500 hover:underline">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
