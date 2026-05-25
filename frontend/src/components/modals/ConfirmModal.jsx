import useUIStore from '../../store/uiStore';

export default function ConfirmModal() {
  const { closeModal, modalData } = useUIStore();
  if (!modalData) return null;

  const { title, message, confirmLabel = 'Confirm', onConfirm } = modalData;

  const handleConfirm = async () => {
    if (onConfirm) await onConfirm();
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 420, padding: 28 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 10 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-danger" onClick={handleConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
