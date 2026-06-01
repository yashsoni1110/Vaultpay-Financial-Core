import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-bg-glow" />
      <div className="auth-bg-glow-2" />

      <div className="auth-card animate-slide-in">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Shield size={24} color="white" />
          </div>
          <span className="auth-logo-text">VaultPay</span>
        </div>

        <h1 className="auth-title" style={{ fontSize: '1.5rem' }}>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your VaultPay account</p>

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: '0.5rem', justifyContent: 'center', height: '44px' }}
          >
            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
              <><LogIn size={16} /> Sign In</>
            )}
          </button>
        </form>

        <div className="divider" />

        {/* Demo credentials */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '1rem', border: '1px solid var(--border)', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Credentials (Click to autofill)</p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div 
              style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}
              onClick={() => setForm({ email: 'admin@vaultpay.io', password: 'Admin@1234' })}
            >
              <span style={{ color: '#c084fc', fontWeight: 600 }}>Admin:</span> admin@vaultpay.io / Admin@1234
            </div>
            <div 
              style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}
              onClick={() => setForm({ email: 'client@vaultpay.io', password: 'Client@1234' })}
            >
              <span style={{ color: 'var(--info-text)', fontWeight: 600 }}>Client:</span> client@vaultpay.io / Client@1234
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
