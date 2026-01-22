export default function Badge({ status }) {
    const styles = {
      Activo: "bg-blue-100 text-blue-700",
      Pendiente: "bg-yellow-100 text-yellow-700",
      Inactivo: "bg-gray-200 text-gray-700",
    };
  
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  }
  