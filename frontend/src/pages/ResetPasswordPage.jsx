import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { Cloud, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return toast.error('Please enter a new password');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await authAPI.resetPassword(token, { password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired token');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="auth-header">
          <div className="auth-logo">
            <Cloud size={32} />
            <span>DriveCloud</span>
          </div>
          <h1>Create New Password</h1>
          <p>Please enter your new password below.</p>
        </div>

        {!success ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link to="/login" className="auth-link">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--accent-emerald)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Password Updated</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Your password has been successfully reset. You will be redirected to the login page momentarily.
            </p>
            <Link to="/login" className="btn btn-primary">
              Log In Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
