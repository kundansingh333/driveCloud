import { useState } from 'react';
import useUIStore from '../../store/uiStore';
import useFileStore from '../../store/fileStore';
import { foldersAPI } from '../../api';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function NewFolderModal() {
  const { closeModal } = useUIStore();
  const { currentFolder, addFolderToList } = useFileStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await foldersAPI.create({ name: name.trim(), parentFolder: currentFolder, color });
      addFolderToList(data.folder);
      toast.success('Folder created');
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 420, padding: 28 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>New Folder</h3>
        <form onSubmit={handleSubmit}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Folder name" />
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
