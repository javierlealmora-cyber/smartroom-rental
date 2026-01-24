// src/components/Modal.jsx
export default function Modal({ isOpen, onClose, title, children, size = "medium" }) {
  if (!isOpen) return null;

  const sizes = {
    small: 500,
    medium: 700,
    large: 1000,
    xlarge: 1200,
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.modal, maxWidth: sizes[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 24px 16px",
    borderBottom: "1px solid #E5E7EB",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },

  closeButton: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: 24,
    color: "#6B7280",
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
    transition: "color 0.2s ease",
  },

  content: {
    padding: 24,
    overflowY: "auto",
  },
};
