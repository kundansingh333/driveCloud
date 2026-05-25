import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { Cloud, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSuccess(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
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
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link.</p>
        </div>

        {!success ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--accent-emerald)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Check your email</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>

            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
