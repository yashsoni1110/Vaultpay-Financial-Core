import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Users, FileText, Wallet, Webhook, TrendingUp, DollarSign } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const StatCard = ({ icon: Icon, value, label, color, bgColor, sub }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bgColor }}>
      <Icon size={22} color={color} />
    </div>
    <div className="stat-value">{value ?? '—'}</div>
    <div className="stat-label">{label}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{sub}</div>}
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const load = () => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => toast.error('Failed to load stats.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load();
    socket.on('invoice_created', handleUpdate);
    socket.on('invoice_updated', handleUpdate);
    socket.on('payout_created', handleUpdate);
    socket.on('payout_updated', handleUpdate);
    socket.on('user_updated', handleUpdate);
    socket.on('webhook_received', handleUpdate);

    return () => {
      socket.off('invoice_created', handleUpdate);
      socket.off('invoice_updated', handleUpdate);
      socket.off('payout_created', handleUpdate);
      socket.off('payout_updated', handleUpdate);
      socket.off('user_updated', handleUpdate);
      socket.off('webhook_received', handleUpdate);
    };
  }, [socket]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!stats) return null;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">Platform-wide metrics</p>
        </div>
        <span className="badge badge-admin" style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}>🛡 Admin</span>
      </div>

      {/* Revenue highlight */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(59,130,246,0.3)' }}>
          <DollarSign size={28} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, var(--primary-200))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ${stats.revenue.total.toLocaleString()}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Platform Revenue (Paid Invoices)</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatCard icon={Users} value={stats.users.total} label="Total Clients" color="#60a5fa" bgColor="rgba(59,130,246,0.12)" sub={`${stats.users.active} active, ${stats.users.inactive} inactive`} />
        <StatCard icon={FileText} value={stats.invoices.total} label="Total Invoices" color="#34d399" bgColor="rgba(16,185,129,0.12)" sub={`${stats.invoices.paid} paid`} />
        <StatCard icon={Wallet} value={stats.payouts.total} label="Total Payouts" color="#fbbf24" bgColor="rgba(245,158,11,0.12)" sub={`${stats.payouts.pending} pending`} />
        <StatCard icon={Webhook} value={stats.webhooks.total} label="Webhook Events" color="#a78bfa" bgColor="rgba(139,92,246,0.12)" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {[
          { href: '/admin/users', label: 'Manage Users', icon: Users, color: 'var(--info-text)' },
          { href: '/admin/payouts', label: 'Review Payouts', icon: Wallet, color: 'var(--warning-text)' },
          { href: '/admin/webhooks', label: 'Webhook Logs', icon: Webhook, color: '#a78bfa' },
        ].map(({ href, label, icon: Icon, color }) => (
          <a key={href} href={href} className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <Icon size={20} color={color} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
