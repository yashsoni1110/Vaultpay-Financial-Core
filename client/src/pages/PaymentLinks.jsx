import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Plus, X, Link2, Copy, ToggleLeft } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const emptyForm = { title: '', description: '', amount: '', currency: 'USD', expiresAt: '' };

export default function PaymentLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { socket } = useSocket();

  const load = async () => {
    try {
      const res = await api.get('/payment-links');
      setLinks(res.data.data);
    } catch { toast.error('Failed to load payment links.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load();
    socket.on('paymentLink_created', handleUpdate);
    socket.on('paymentLink_updated', handleUpdate);
    return () => {
      socket.off('paymentLink_created', handleUpdate);
      socket.off('paymentLink_updated', handleUpdate);
    };
  }, [socket]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payment-links', { ...form, amount: Number(form.amount) });
      toast.success('Payment link created!');
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payment link.');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.patch(`/payment-links/${id}/deactivate`);
      toast.success('Payment link deactivated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    }
  };

  const copyUrl = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${slug}`);
    toast.success('Link copied to clipboard!');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Links</h1>
          <p className="page-subtitle">{links.length} links created</p>
        </div>
        <button id="create-link-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Link
        </button>
      </div>

      {links.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Link2 size={28} color="var(--text-muted)" /></div>
            <p>No payment links yet. Create your first one!</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {links.map((link) => (
            <div key={link._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              {link.isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--primary-600), var(--primary-400))' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{link.title}</h3>
                  {link.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{link.description}</p>}
                </div>
                <span className={`badge ${link.isActive ? 'badge-success' : 'badge-gray'}`}>
                  {link.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                ${Number(link.amount).toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>{link.currency}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => copyUrl(link.slug)} style={{ flex: 1 }}>
                  <Copy size={13} /> Copy Link
                </button>
                {link.isActive && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(link._id)}>
                    <ToggleLeft size={13} /> Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Payment Link</h2>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form id="payment-link-form" onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" htmlFor="link-title">Title</label>
                <input id="link-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Consulting Session" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="link-desc">Description (optional)</label>
                <input id="link-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="1-hour technical consulting" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="link-amount">Amount</label>
                  <input id="link-amount" className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="150.00" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="link-currency">Currency</label>
                  <select id="link-currency" className="form-select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="link-expires">Expires At (optional)</label>
                <input id="link-expires" className="form-input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="link-save-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Create Link'}
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
