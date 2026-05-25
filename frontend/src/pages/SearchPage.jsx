import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchAPI } from '../api';
import useUIStore from '../store/uiStore';
import FileGrid from '../components/files/FileGrid';
import FileList from '../components/files/FileList';
import { Search, Loader2 } from 'lucide-react';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const tags = searchParams.get('tags') || '';
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { viewMode } = useUIStore();

  useEffect(() => {
    if (query || type || tags) performSearch();
  }, [query, type, tags]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const { data } = await searchAPI.search({ q: query, type, tags });
      setFiles(data.files);
      setFolders(data.folders);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={22} /> Search results
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
        {loading ? 'Searching...' : `${files.length + folders.length} results ${query ? `for "${query}"` : ''}`}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {['document', 'image', 'video', 'audio', 'code', 'archive'].map((tag) => (
          <button
            key={tag}
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              if (tags === tag) newParams.delete('tags');
              else newParams.set('tags', tag);
              navigate(`/search?${newParams.toString()}`);
            }}
            className={`btn btn-sm ${tags === tag ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 20, textTransform: 'capitalize' }}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        </div>
      ) : files.length === 0 && folders.length === 0 ? (
        <div className="empty-state">
          <Search size={80} strokeWidth={1} />
          <h3>No results found</h3>
          <p>Try different keywords or check your spelling</p>
        </div>
      ) : viewMode === 'grid' ? (
        <FileGrid files={files} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
      ) : (
        <FileList files={files} folders={folders} onFolderClick={(id) => navigate(`/folder/${id}`)} />
      )}
    </div>
  );
}
