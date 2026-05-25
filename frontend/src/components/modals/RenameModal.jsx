import { useState } from 'react';
import useUIStore from '../../store/uiStore';
import useFileStore from '../../store/fileStore';
import { filesAPI, foldersAPI } from '../../api';
import toast from 'react-hot-toast';

export default function RenameModal() {
  const { closeModal, modalData } = useUIStore();
  const { updateFileInList, updateFolderInList } = useFileStore();
  const [name, setName] = useState(modalData?.item?.name || '');
  const [loading, setLoading] = useState(false);

  if (!modalData) return null;
  const { item, type } = modalData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (type === 'file') {
        await filesAPI.update(item._id, { name: name.trim() });
        updateFileInList(item._id, { name: name.trim() });
      } else {
        await foldersAPI.update(item._id, { name: name.trim() });
        updateFolderInList(item._id, { name: name.trim() });
      }
      toast.success('Renamed successfully');
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 420, padding: 28 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>Rename</h3>
        <form onSubmit={handleSubmit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Enter new name" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
