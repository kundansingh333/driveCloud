import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumb({ breadcrumbs = [] }) {
  const navigate = useNavigate();

  const handleClick = (crumb) => {
    if (crumb.id === null) {
      navigate('/');
    } else {
      navigate(`/folder/${crumb.id}`);
    }
  };

  return (
    <div className="breadcrumb">
      {breadcrumbs.map((crumb, idx) => (
        <span key={idx} className="breadcrumb-item">
          {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
          <button
            className={`breadcrumb-link ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}
            onClick={() => handleClick(crumb)}
          >
            {crumb.name}
          </button>
        </span>
      ))}

      <style>{`
        .breadcrumb { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; margin-bottom: 20px; }
        .breadcrumb-item { display: flex; align-items: center; gap: 2px; }
        .breadcrumb-separator { color: var(--text-muted); flex-shrink: 0; }
        .breadcrumb-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          font-family: inherit;
        }
        .breadcrumb-link:hover { background: var(--bg-hover); color: var(--text-primary); }
        .breadcrumb-link.active { color: var(--text-primary); font-weight: 600; }
      `}</style>
    </div>
  );
}
