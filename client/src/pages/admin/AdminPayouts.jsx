import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Wallet, CheckCircle, XCircle, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const statusBadge = (status) => {
  const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', processing: 'badge-info', completed: 'badge-success' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { socket } = useSocket();

  const load = async () => {
    try {
      const res = await api.get('/admin/payouts');
      setPayouts(res.data.data);
    } catch { toast.error('Failed to load payouts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      load();
    };

    socket.on('payout_created', handleUpdate);
    socket.on('payout_updated', handleUpdate);

    return () => {
      socket.off('payout_created', handleUpdate);
      socket.off('payout_updated', handleUpdate);
    };
  }, [socket]);

  const updateStatus = async (id, status) => {
    setSaving(true);
    try {
      await api.patch(`/admin/payouts/${id}/status`, { status, adminNote: note });
      toast.success(`Payout ${status}.`);
      setSelected(null);
      setNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payout Requests</h1>
          <p className="page-subtitle">Review and approve client withdrawals</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Amount</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Wallet size={28} color="var(--text-muted)" /></div>
                    <p>No payout requests.</p>
                  </div>
                </td></tr>
              ) : payouts.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong>{p.userId?.firstName} {p.userId?.lastName}</strong>
                    <div className="text-xs text-muted">{p.userId?.email}</div>
                  </td>
                  <td><strong>${p.amount.toLocaleString()} {p.currency}</strong></td>
                  <td>
                    <div className="text-sm">{p.bankDetails?.bankName}</div>
                    <div className="text-xs text-muted">{p.bankDetails?.accountName} — {p.bankDetails?.accountNumber}</div>
                  </td>
                  <td>{statusBadge(p.status)}</td>
                  <td className="text-sm text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button id={`approve-payout-${p._id}`} className="btn btn-success btn-sm" onClick={() => { setSelected({ ...p, action: 'approved' }); setNote(''); }}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button id={`reject-payout-${p._id}`} className="btn btn-danger btn-sm" onClick={() => { setSelected({ ...p, action: 'rejected' }); setNote(''); }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                    {p.adminNote && p.status !== 'pending' && (
                      <span className="text-xs text-muted">{p.adminNote}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selected.action === 'approved' ? '✅ Approve Payout' : '❌ Reject Payout'}
              </h2>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <p className="text-sm"><strong>${selected.amount.toLocaleString()} {selected.currency}</strong> to {selected.userId?.firstName} {selected.userId?.lastName}</p>
              <p className="text-xs text-muted mt-1">{selected.bankDetails?.bankName} — {selected.bankDetails?.accountName}</p>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-payout-note">Admin Note (optional)</label>
              <textarea id="admin-payout-note" className="form-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or note for the client..." style={{ minHeight: '80px' }} />
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button
                id={`confirm-payout-action-btn`}
                className={`btn ${selected.action === 'approved' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => updateStatus(selected._id, selected.action)}
                disabled={saving}
              >
                {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : `Confirm ${selected.action}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
