import { useEffect, useState } from 'react';
import { storageAPI } from '../api';
import { formatFileSize } from '../utils/helpers';
import { HardDrive, Image, Video, Music, FileText, Code, Archive, File } from 'lucide-react';

const categoryIcons = {
  images: { icon: Image, color: '#10b981', label: 'Images' },
  videos: { icon: Video, color: '#ef4444', label: 'Videos' },
  audio: { icon: Music, color: '#8b5cf6', label: 'Audio' },
  documents: { icon: FileText, color: '#3b82f6', label: 'Documents' },
  code: { icon: Code, color: '#f59e0b', label: 'Code' },
  archives: { icon: Archive, color: '#06b6d4', label: 'Archives' },
  other: { icon: File, color: '#64748b', label: 'Other' },
};

export default function StoragePage() {
  const [usage, setUsage] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usageRes, breakdownRes] = await Promise.all([
        storageAPI.getUsage(),
        storageAPI.getBreakdown(),
      ]);
      setUsage(usageRes.data);
      setBreakdown(breakdownRes.data.breakdown);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <HardDrive size={22} /> Storage
      </h2>

      {usage && (
        <div className="storage-overview card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatFileSize(usage.used)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                of {formatFileSize(usage.limit)} used ({usage.percentage}%)
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {usage.totalFiles} files
            </div>
          </div>
          <div className="progress-bar" style={{ height: 10, borderRadius: 'var(--radius-full)' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(usage.percentage, 100)}%`,
                height: '100%',
                background: usage.percentage > 90
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : usage.percentage > 70
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                transition: 'width 1s ease-out',
              }}
            />
          </div>
          {usage.trash.files > 0 && (
            <div style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              📂 {usage.trash.files} files in trash ({formatFileSize(usage.trash.size)})
            </div>
          )}
        </div>
      )}

      {breakdown && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            Storage breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {Object.entries(breakdown).filter(([, v]) => v.count > 0).map(([key, val]) => {
              const cat = categoryIcons[key] || categoryIcons.other;
              const Icon = cat.icon;
              const pct = usage ? Math.round((val.size / usage.used) * 100) || 0 : 0;
              return (
                <div key={key} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} style={{ color: cat.color }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{val.count} files</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 6 }}>{formatFileSize(val.size)}</div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
