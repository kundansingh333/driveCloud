import { useState, useEffect } from 'react';
import { FolderClosed, ChevronRight, ChevronDown } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useFileStore from '../../store/fileStore';
import { filesAPI, foldersAPI } from '../../api';
import toast from 'react-hot-toast';

export default function MoveModal() {
  const { closeModal, modalData } = useUIStore();
  const { removeFileFromList, removeFolderFromList } = useFileStore();
  const [tree, setTree] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    try {
      const { data } = await foldersAPI.getTree();
      setTree(data.tree);
    } catch { /* ignore */ }
  };

  if (!modalData) return null;
  const { item, type } = modalData;

  const handleMove = async () => {
    setLoading(true);
    try {
      if (type === 'file') {
        await filesAPI.move(item._id, { parentFolder: selected });
        removeFileFromList(item._id);
      } else {
        await foldersAPI.move(item._id, { parentFolder: selected });
        removeFolderFromList(item._id);
      }
      toast.success('Moved successfully');
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Move failed');
    }
    setLoading(false);
  };

  const renderTree = (nodes, depth = 0) => nodes.map((node) => (
    <div key={node._id}>
      <div
        className={`move-tree-item ${selected === node._id ? 'selected' : ''}`}
        style={{ paddingLeft: 12 + depth * 20 }}
        onClick={() => setSelected(node._id)}
      >
        {node.children?.length > 0 ? (
          <button className="tree-toggle" onClick={(e) => { e.stopPropagation(); setExpanded((p) => ({ ...p, [node._id]: !p[node._id] })); }}>
            {expanded[node._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : <span style={{ width: 14 }} />}
        <FolderClosed size={16} style={{ color: node.color || '#3b82f6' }} />
        <span>{node.name}</span>
      </div>
      {expanded[node._id] && node.children?.length > 0 && renderTree(node.children, depth + 1)}
    </div>
  ));

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 420, padding: 24 }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4 }}>Move &quot;{item.name}&quot;</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>Select destination folder</p>

        <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
          <div
            className={`move-tree-item ${selected === null ? 'selected' : ''}`}
            style={{ paddingLeft: 12 }}
            onClick={() => setSelected(null)}
          >
            <FolderClosed size={16} style={{ color: '#3b82f6' }} />
            <span>My Drive</span>
          </div>
          {renderTree(tree)}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMove} disabled={loading}>
            {loading ? 'Moving...' : 'Move here'}
          </button>
        </div>

        <style>{`
          .move-tree-item {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 12px; cursor: pointer; font-size: 0.8125rem;
            transition: background var(--transition-fast);
            border-radius: var(--radius-sm);
          }
          .move-tree-item:hover { background: var(--bg-hover); }
          .move-tree-item.selected { background: var(--bg-active); color: var(--accent-blue); }
        `}</style>
      </div>
    </div>
  );
}
