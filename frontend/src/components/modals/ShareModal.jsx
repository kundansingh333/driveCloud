import { useState, useEffect } from 'react';
import useUIStore from '../../store/uiStore';
import { shareAPI } from '../../api';
import toast from 'react-hot-toast';
import { Link, Copy, Key, Calendar, Trash2, Users, Send, User } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

export default function ShareModal() {
  const { closeModal, modalData } = useUIStore();
  const item = modalData?.item; // Can be a file or a folder
  const itemType = item?.size !== undefined ? 'file' : 'folder'; // simple heuristic

  const [activeTab, setActiveTab] = useState('internal'); // 'internal' or 'public'
  const [loading, setLoading] = useState(false);

  // Public Link State
  const [shareData, setShareData] = useState(null);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Internal Share State
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [internalShares, setInternalShares] = useState([]);

  useEffect(() => {
    if (itemType === 'file' && item?.isPublic && item?.publicLink) {
      setShareData({
        link: item.publicLink,
        isPasswordProtected: !!item.publicPassword,
      });
    }
    
    if (item) fetchInternalShares();
  }, [item]);

  const fetchInternalShares = async () => {
    try {
      const { data } = await shareAPI.getItemShares(itemType, item._id);
      setInternalShares(data.shares || []);
    } catch { /* ignore */ }
  };

  if (!item) return null;

  const handleGenerateLink = async (e) => {
    e?.preventDefault();
    if (itemType !== 'file') return toast.error('Public links are only for files.');
    setLoading(true);
    try {
      const { data } = await shareAPI.createLink(item._id, {
        password: password || undefined,
        expiresAt: expiresAt || undefined,
      });
      setShareData(data);
      toast.success('Share link generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate link');
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await shareAPI.revokeLink(item._id);
      setShareData(null);
      setPassword('');
      setExpiresAt('');
      toast.success('Link revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke link');
    }
    setLoading(false);
  };

  const handleShareInternal = async (e) => {
    e?.preventDefault();
    if (!email) return toast.error('Email is required');
    setLoading(true);
    try {
      await shareAPI.shareInternal({
        itemType,
        itemId: item._id,
        email,
        permission,
      });
      toast.success('Shared successfully!');
      setEmail('');
      fetchInternalShares();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share');
    }
    setLoading(false);
  };

  const handleRevokeInternal = async (shareId) => {
    setLoading(true);
    try {
      await shareAPI.revokeInternal(shareId);
      toast.success('Access revoked');
      fetchInternalShares();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!shareData?.link) return;
    const url = `${window.location.origin}/share/${shareData.link}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 520, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            Share "{item.name}"
          </h3>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', padding: '0 24px' }}>
          <button
            className={`tab-btn ${activeTab === 'internal' ? 'active' : ''}`}
            onClick={() => setActiveTab('internal')}
          >
            <Users size={16} /> Internal Share
          </button>
          {itemType === 'file' && (
            <button
              className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
              onClick={() => setActiveTab('public')}
            >
              <Link size={16} /> Public Link
            </button>
          )}
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'internal' && (
            <div>
              <form onSubmit={handleShareInternal} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <input
                  type="email"
                  className="input"
                  placeholder="Email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select className="input" value={permission} onChange={(e) => setPermission(e.target.value)} style={{ width: 110 }}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button type="submit" className="btn btn-primary btn-icon" disabled={loading} title="Share">
                  <Send size={18} />
                </button>
              </form>

              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Shared with</h4>
                {internalShares.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Not shared with anyone yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {internalShares.map(share => (
                      <div key={share._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="user-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                            {share.sharedWith?.name?.charAt(0).toUpperCase() || <User size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{share.sharedWith?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{share.sharedWith?.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{share.permission}</span>
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--accent-rose)', width: 28, height: 28 }} onClick={() => handleRevokeInternal(share._id)} title="Remove access">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'public' && (
            <div>
              {!shareData ? (
                <form onSubmit={handleGenerateLink}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <Key size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                      Password Protection (Optional)
                    </label>
                    <input type="text" className="input" placeholder="Leave blank for no password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                      Expiration Date (Optional)
                    </label>
                    <input type="date" className="input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Generating...' : 'Generate Link'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Public Link</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input readOnly value={`${window.location.origin}/share/${shareData.link}`} className="input" style={{ background: 'var(--bg-secondary)' }} />
                      <button className="btn btn-primary btn-icon" onClick={copyToClipboard} title="Copy Link"><Copy size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {shareData.isPasswordProtected && <span>🔒 Password protected</span>}
                      {shareData.expiresAt && <span>⏳ Expires {formatDate(shareData.expiresAt)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn-ghost" style={{ color: 'var(--accent-rose)' }} onClick={handleRevoke} disabled={loading}>
                      <Trash2 size={16} /> Revoke Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-tertiary)' }}>
          <button className="btn btn-secondary" onClick={closeModal}>Close</button>
        </div>

        <style>{`
          .tab-btn {
            background: none; border: none; padding: 12px 20px; font-size: 0.875rem; font-weight: 500;
            color: var(--text-secondary); cursor: pointer; display: flex; alignItems: center; gap: 8px;
            border-bottom: 2px solid transparent; transition: all 0.2s;
          }
          .tab-btn:hover { color: var(--text-primary); }
          .tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); }
        `}</style>
      </div>
    </div>
  );
}
