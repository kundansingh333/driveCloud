import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { foldersAPI } from '../api';
import useUIStore from '../store/uiStore';
import FileGrid from '../components/files/FileGrid';
import FileList from '../components/files/FileList';
import { Star } from 'lucide-react';

export default function StarredPage() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { viewMode } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = async () => {
    setLoading(true);
    try {
      const { data } = await foldersAPI.getStarred();
      setFiles(data.files);
      setFolders(data.folders);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Star size={22} style={{ color: 'var(--accent-amber)' }} /> Starred
      </h2>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="empty-state">
          <Star size={80} strokeWidth={1} />
          <h3>No starred items</h3>
          <p>Add stars to files and folders to find them easily here</p>
        </div>
      ) : viewMode === 'grid' ? (
        <FileGrid files={files} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
      ) : (
        <FileList files={files} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
      )}
    </div>
  );
}
