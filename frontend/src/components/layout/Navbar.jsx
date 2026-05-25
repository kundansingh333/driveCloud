import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3X3, List, SortAsc, Menu, Sun, Moon, LogOut, User, Upload } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { searchAPI } from '../../api';

export default function Navbar() {
  const { viewMode, setViewMode, theme, setTheme, sortBy, setSortBy, toggleSidebar, openUploadDrawer } = useUIStore();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
      setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length >= 2) {
      try {
        const { data } = await searchAPI.suggestions(q);
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } catch { /* ignore */ }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/search${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
    setShowSuggestions(false);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      if (e.target.files.length > 0) {
        window.dispatchEvent(new CustomEvent('triggerUpload', { detail: { files: Array.from(e.target.files) } }));
      }
    };
    input.click();
  };

  const sortOptions = [
    { value: 'date_newest', label: 'Newest first' },
    { value: 'date_oldest', label: 'Oldest first' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'size_largest', label: 'Size (largest)' },
    { value: 'size_smallest', label: 'Size (smallest)' },
  ];

  return (
    <header className="navbar glass">
      <div className="navbar-left">
        <button className="btn btn-ghost btn-icon navbar-menu" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <form onSubmit={handleSearchSubmit} className="navbar-search" ref={searchRef}>
          <Search size={18} className="search-icon" />
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={handleSearch}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="search-suggestion-item"
                  onClick={() => {
                    if (s.type === 'folder') navigate(`/folder/${s.id}`);
                    else navigate(`/search?q=${encodeURIComponent(s.name)}`);
                    setShowSuggestions(false);
                    setSearchQuery('');
                  }}
                >
                  <span className={`badge badge-${s.type === 'folder' ? 'blue' : 'emerald'}`}>{s.type}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      <div className="navbar-right">
        <button className="btn btn-primary btn-sm" onClick={handleFileUpload} data-tooltip="Upload files">
          <Upload size={16} /> Upload
        </button>

        <div className="navbar-controls">
          <button className={`btn btn-ghost btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} data-tooltip="Grid view">
            <Grid3X3 size={18} />
          </button>
          <button className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} data-tooltip="List view">
            <List size={18} />
          </button>

          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setShowSortMenu(!showSortMenu)} data-tooltip="Sort">
              <SortAsc size={18} />
            </button>
            {showSortMenu && (
              <div className="dropdown-menu" style={{ right: 0 }}>
                {sortOptions.map((opt) => (
                  <button key={opt.value} className={`dropdown-item ${sortBy === opt.value ? 'active' : ''}`} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-ghost btn-icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} data-tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="navbar-user" ref={userMenuRef}>
          <button className="user-avatar-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>
          {showUserMenu && (
            <div className="dropdown-menu user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
              </div>
              <div className="context-menu-divider" />
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); }}>
                <User size={16} /> Profile
              </button>
              <button className="dropdown-item danger" onClick={() => { setShowUserMenu(false); logout(); }}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          height: var(--navbar-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 90;
          gap: 16px;
          transition: left var(--transition-normal);
        }
        .navbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .navbar-menu { display: none; }
        .navbar-search { position: relative; flex: 1; max-width: 560px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input {
          width: 100%;
          padding: 9px 14px 9px 40px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-full);
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
          transition: all var(--transition-fast);
          font-family: inherit;
        }
        .search-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .search-input::placeholder { color: var(--text-muted); }
        .search-suggestions {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 4px;
          z-index: 100;
          animation: fadeInUp var(--transition-fast) ease-out;
        }
        .search-suggestion-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.8125rem;
          color: var(--text-primary);
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          transition: background var(--transition-fast);
        }
        .search-suggestion-item:hover { background: var(--bg-hover); }
        .navbar-right { display: flex; align-items: center; gap: 8px; }
        .navbar-controls { display: flex; align-items: center; gap: 2px; }
        .navbar-controls .btn-icon.active { background: var(--bg-active); color: var(--accent-blue); }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 4px;
          min-width: 180px;
          z-index: 200;
          animation: fadeInUp var(--transition-fast) ease-out;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--text-secondary);
          cursor: pointer;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          transition: all var(--transition-fast);
        }
        .dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .dropdown-item.active { color: var(--accent-blue); }
        .dropdown-item.danger { color: var(--accent-rose); }
        .dropdown-item.danger:hover { background: rgba(239,68,68,0.1); }
        .navbar-user { position: relative; }
        .user-avatar-btn { background: none; border: none; cursor: pointer; padding: 0; }
        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
          transition: all var(--transition-fast);
        }
        .user-avatar-btn:hover .user-avatar { box-shadow: 0 0 0 3px rgba(59,130,246,0.3); }
        .user-dropdown { right: 0; min-width: 240px; padding: 8px; }
        .user-dropdown-header { display: flex; align-items: center; gap: 12px; padding: 8px; }
        @media (max-width: 768px) {
          .navbar { left: 0; }
          .navbar-menu { display: flex; }
          .navbar-controls .btn-icon:not(:first-child):not(:nth-child(2)) { display: none; }
        }
      `}</style>
    </header>
  );
}
