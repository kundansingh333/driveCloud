import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Cloud, FolderClosed, Star, Trash2, HardDrive, Clock, ChevronRight, ChevronDown, Plus, Users } from 'lucide-react';
import { foldersAPI } from '../../api';
import useUIStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { storageAPI } from '../../api';
import { formatFileSize } from '../../utils/helpers';

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const openModal = useUIStore((s) => s.openModal);
  const user = useAuthStore((s) => s.user);
  const [folderTree, setFolderTree] = useState([]);
  const [storage, setStorage] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadFolderTree();
    loadStorage();
  }, []);

  const loadFolderTree = async () => {
    try {
      const { data } = await foldersAPI.getTree();
      setFolderTree(data.tree);
    } catch { /* ignore */ }
  };

  const loadStorage = async () => {
    try {
      const { data } = await storageAPI.getUsage();
      setStorage(data);
    } catch { /* ignore */ }
  };

  const toggleFolder = (id) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (nodes, depth = 0) => (
    nodes.map((node) => (
      <div key={node._id} style={{ paddingLeft: depth * 16 }}>
        <div
          className="sidebar-tree-item"
          onClick={() => navigate(`/folder/${node._id}`)}
        >
          {node.children?.length > 0 ? (
            <button className="tree-toggle" onClick={(e) => { e.stopPropagation(); toggleFolder(node._id); }}>
              {expandedFolders[node._id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <span style={{ width: 14 }} />}
          <FolderClosed size={16} style={{ color: node.color || '#3b82f6', flexShrink: 0 }} />
          <span className="tree-label">{node.name}</span>
        </div>
        {expandedFolders[node._id] && node.children?.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ))
  );

  if (!sidebarOpen) return null;

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Cloud size={28} strokeWidth={1.5} />
          <span>DriveCloud</span>
        </div>
        <button className="btn btn-primary btn-sm sidebar-new-btn" onClick={() => openModal('newFolder')}>
          <Plus size={16} /> New
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <FolderClosed size={18} />
          <span>My Drive</span>
        </NavLink>
        <NavLink to="/starred" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Star size={18} />
          <span>Starred</span>
        </NavLink>
        <NavLink to="/shared" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Users size={18} />
          <span>Shared with me</span>
        </NavLink>
        <NavLink to="/trash" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <Trash2 size={18} />
          <span>Trash</span>
        </NavLink>
        <NavLink to="/storage" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
          <HardDrive size={18} />
          <span>Storage</span>
        </NavLink>
      </nav>

      {folderTree.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Folders</div>
          <div className="sidebar-tree">
            {renderTree(folderTree)}
          </div>
        </div>
      )}

      {storage && (
        <div className="sidebar-storage">
          <div className="storage-info">
            <HardDrive size={16} />
            <span>{formatFileSize(storage.used)} of {formatFileSize(storage.limit)} used</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(storage.percentage, 100)}%`,
                background: storage.percentage > 90
                  ? 'linear-gradient(90deg, var(--accent-rose), #dc2626)'
                  : storage.percentage > 70
                  ? 'linear-gradient(90deg, var(--accent-amber), #d97706)'
                  : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          z-index: 100;
          animation: slideInLeft var(--transition-normal) ease-out;
          overflow: hidden;
        }
        .sidebar-header {
          padding: 20px 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--accent-blue);
          font-size: 1.25rem;
          font-weight: 700;
          padding: 0 4px;
        }
        .sidebar-new-btn {
          width: 100%;
          justify-content: center;
          padding: 10px;
          font-size: 0.9rem;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 12px;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .sidebar-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sidebar-item.active { background: var(--bg-active); color: var(--text-primary); }
        .sidebar-section {
          padding: 8px 12px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        .sidebar-section-title {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding: 8px 12px 4px;
        }
        .sidebar-tree-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .sidebar-tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .tree-toggle {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .tree-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-storage {
          padding: 16px;
          border-top: 1px solid var(--border-primary);
          margin-top: auto;
        }
        .storage-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        @media (max-width: 768px) {
          .sidebar { display: none; }
        }
      `}</style>
    </aside>
  );
}
