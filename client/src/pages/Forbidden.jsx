import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
        top: -150,
        right: -150,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        bottom: -100,
        left: -100,
        pointerEvents: 'none',
      }} />

      <div style={{
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        padding: '2rem',
        maxWidth: 480,
      }}>
        {/* Icon */}
        <div style={{
          width: 96,
          height: 96,
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          boxShadow: '0 0 40px rgba(239,68,68,0.15)',
        }}>
          <ShieldOff size={44} color="var(--danger-text)" strokeWidth={1.5} />
        </div>

        {/* 403 */}
        <div style={{
          fontSize: '6rem',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, var(--danger-text), rgba(239,68,68,0.5))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.04em',
        }}>
          403
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
        }}>
          Access Denied
        </h1>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}>
          You do not have permission to view this page.
          This area is restricted to administrators only.
        </p>

        <button
          id="forbidden-back-btn"
          className="btn btn-primary"
          onClick={() => navigate('/dashboard')}
          style={{ gap: '0.5rem' }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
