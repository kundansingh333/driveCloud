import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Cloud, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>
      <div className="auth-container animate-fade-in-up">
        <div className="auth-header">
          <div className="auth-logo">
            <Cloud size={36} strokeWidth={1.5} />
            <span>DriveCloud</span>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to access your files</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
              <button type="button" className="input-icon-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        .auth-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }
        .auth-orb-1 {
          width: 500px; height: 500px;
          background: var(--accent-blue);
          top: -150px; right: -100px;
        }
        .auth-orb-2 {
          width: 400px; height: 400px;
          background: var(--accent-purple);
          bottom: -100px; left: -80px;
        }
        .auth-orb-3 {
          width: 300px; height: 300px;
          background: var(--accent-cyan);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          padding: 40px;
          box-shadow: var(--shadow-lg);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 24px;
          color: var(--accent-blue);
          font-size: 1.5rem;
          font-weight: 700;
        }
        .auth-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .auth-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon .input {
          padding-right: 44px;
        }
        .input-icon-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          border-radius: var(--radius-sm);
        }
        .input-icon-btn:hover {
          color: var(--text-primary);
        }
        .auth-submit {
          width: 100%;
          margin-top: 8px;
        }
        .auth-switch {
          text-align: center;
          margin-top: 24px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .auth-switch a {
          color: var(--accent-blue);
          text-decoration: none;
          font-weight: 500;
        }
        .auth-switch a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
