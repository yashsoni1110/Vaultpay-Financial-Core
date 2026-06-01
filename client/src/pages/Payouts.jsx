import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Plus, X, Wallet } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const statusBadge = (status) => {
  const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger', processing: 'badge-info', completed: 'badge-success' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

const emptyForm = {
  amount: '', currency: 'USD',
  bankDetails: { bankName: '', accountName: '', accountNumber: '', routingNumber: '' }
};

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { socket } = useSocket();

  const load = async () => {
    try {
      const res = await api.get('/payouts');
      setPayouts(res.data.data);
    } catch { toast.error('Failed to load payouts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedPayout) => {
      load();
      toast(`Payout is now ${updatedPayout.status}`, { icon: '🔄', id: updatedPayout._id });
    };
    socket.on('payout_updated', handleUpdate);
    return () => socket.off('payout_updated', handleUpdate);
  }, [socket]);

  const setBank = (field, val) => setForm({ ...form, bankDetails: { ...form.bankDetails, [field]: val } });

  const handleRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payouts', { ...form, amount: Number(form.amount) });
      toast.success('Payout requested! Pending admin approval.');
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request payout.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payouts</h1>
          <p className="page-subtitle">Request and track your withdrawals</p>
        </div>
        <button id="request-payout-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Request Payout
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Bank</th>
                <th>Account</th>
                <th>Status</th>
                <th>Admin Note</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Wallet size={28} color="var(--text-muted)" /></div>
                    <p>No payouts yet.</p>
                  </div>
                </td></tr>
              ) : payouts.map((p) => (
                <tr key={p._id}>
                  <td><strong>${p.amount.toLocaleString()} {p.currency}</strong></td>
                  <td><strong>{p.bankDetails?.bankName}</strong></td>
                  <td className="text-sm text-muted">{p.bankDetails?.accountName}<br />{p.bankDetails?.accountNumber}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td className="text-sm text-muted">{p.adminNote || '—'}</td>
                  <td className="text-sm text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Request Payout</h2>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form id="payout-form" onSubmit={handleRequest}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="payout-amount">Amount</label>
                  <input id="payout-amount" className="form-input" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="500" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="payout-currency">Currency</label>
                  <select id="payout-currency" className="form-select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option>
                  </select>
                </div>
              </div>
              <div className="divider" />
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</p>
              <div className="form-group">
                <label className="form-label" htmlFor="payout-bank-name">Bank Name</label>
                <input id="payout-bank-name" className="form-input" value={form.bankDetails.bankName} onChange={(e) => setBank('bankName', e.target.value)} required placeholder="Chase Bank" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="payout-account-name">Account Name</label>
                  <input id="payout-account-name" className="form-input" value={form.bankDetails.accountName} onChange={(e) => setBank('accountName', e.target.value)} required placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="payout-account-number">Account Number</label>
                  <input id="payout-account-number" className="form-input" value={form.bankDetails.accountNumber} onChange={(e) => setBank('accountNumber', e.target.value)} required placeholder="**** 1234" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="payout-routing">Routing Number (optional)</label>
                <input id="payout-routing" className="form-input" value={form.bankDetails.routingNumber} onChange={(e) => setBank('routingNumber', e.target.value)} placeholder="021000021" />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="payout-save-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
