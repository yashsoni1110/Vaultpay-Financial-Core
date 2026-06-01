import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { FileText, Link2, Wallet, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const StatCard = ({ icon: Icon, value, label, color, bgColor }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bgColor }}>
      <Icon size={22} color={color} />
    </div>
    <div className="stat-value">{value ?? '—'}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const statusBadge = (status) => {
  const map = {
    paid: 'badge-success', sent: 'badge-info', draft: 'badge-gray',
    overdue: 'badge-danger', pending: 'badge-warning',
    approved: 'badge-success', rejected: 'badge-danger',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const load = async () => {
    try {
      const [inv, pay, lnk] = await Promise.all([
        api.get('/invoices?limit=5'),
        api.get('/payouts?limit=5'),
        api.get('/payment-links?limit=5'),
      ]);
      setInvoices(inv.data.data);
      setPayouts(pay.data.data);
      setLinks(lnk.data.data);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load();
    socket.on('invoice_created', handleUpdate);
    socket.on('invoice_updated', handleUpdate);
    socket.on('invoice_deleted', handleUpdate);
    socket.on('payout_created', handleUpdate);
    socket.on('payout_updated', handleUpdate);
    socket.on('paymentLink_created', handleUpdate);
    socket.on('paymentLink_updated', handleUpdate);

    return () => {
      socket.off('invoice_created', handleUpdate);
      socket.off('invoice_updated', handleUpdate);
      socket.off('invoice_deleted', handleUpdate);
      socket.off('payout_created', handleUpdate);
      socket.off('payout_updated', handleUpdate);
      socket.off('paymentLink_created', handleUpdate);
      socket.off('paymentLink_updated', handleUpdate);
    };
  }, [socket]);

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + i.totalAmount, 0);

  const pendingPayouts = payouts.filter((p) => p.status === 'pending').length;
  const activeLinks = links.filter((l) => l.isActive).length;

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName} 👋</h1>
          <p className="page-subtitle">Here's your financial overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={TrendingUp} value={`$${totalRevenue.toLocaleString()}`} label="Total Revenue (Paid)" color="#34d399" bgColor="rgba(16,185,129,0.12)" />
        <StatCard icon={FileText} value={invoices.length} label="Recent Invoices" color="#60a5fa" bgColor="rgba(59,130,246,0.12)" />
        <StatCard icon={Wallet} value={pendingPayouts} label="Pending Payouts" color="#fbbf24" bgColor="rgba(245,158,11,0.12)" />
        <StatCard icon={Link2} value={activeLinks} label="Active Payment Links" color="#a78bfa" bgColor="rgba(139,92,246,0.12)" />
      </div>

      <div className="dashboard-grid">
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Invoices</div>
              <div className="card-subtitle">{invoices.length} total</div>
            </div>
            <FileText size={18} color="var(--text-muted)" />
          </div>
          {invoices.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p>No invoices yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {invoices.map((inv) => (
                <div key={inv._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.clientName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.invoiceNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>${inv.totalAmount.toLocaleString()}</div>
                    <div style={{ marginTop: '0.25rem' }}>{statusBadge(inv.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payouts */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Payouts</div>
              <div className="card-subtitle">{payouts.length} total</div>
            </div>
            <Wallet size={18} color="var(--text-muted)" />
          </div>
          {payouts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p>No payouts yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {payouts.map((p) => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.bankDetails?.bankName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>${p.amount.toLocaleString()}</div>
                    <div style={{ marginTop: '0.25rem' }}>{statusBadge(p.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
