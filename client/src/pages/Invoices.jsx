import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';
import { Plus, X, FileText, Trash2, CreditCard, Eye } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const statusBadge = (status) => {
  const map = { paid: 'badge-success', sent: 'badge-info', draft: 'badge-gray', overdue: 'badge-danger', cancelled: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

const emptyForm = {
  clientName: '', clientEmail: '', currency: 'USD', dueDate: '',
  notes: '', items: [{ description: '', quantity: 1, unitPrice: 0 }],
  targetUserId: '',
};

export default function Invoices() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [paying, setPaying]       = useState({}); // { [invoiceId]: true } — per-invoice lock

  // Admin client list for the "Assign to Client" dropdown
  const [clients, setClients]     = useState([]);

  const load = async () => {
    try {
      const endpoint = isAdmin ? '/admin/invoices' : '/invoices';
      const res = await api.get(endpoint);
      setInvoices(res.data.data);
    } catch { toast.error('Failed to load invoices.'); }
    finally { setLoading(false); }
  };

  const loadClients = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/admin/users?limit=100');
      setClients((res.data.data || []).filter((u) => u.role !== 'admin'));
    } catch { /* non-fatal */ }
  };

  useEffect(() => { load(); loadClients(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load();
    socket.on('invoice_created', handleUpdate);
    socket.on('invoice_updated', handleUpdate);
    socket.on('invoice_deleted', handleUpdate);
    return () => {
      socket.off('invoice_created', handleUpdate);
      socket.off('invoice_updated', handleUpdate);
      socket.off('invoice_deleted', handleUpdate);
    };
  }, [socket]);

  const handleItemChange = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'description' ? val : Number(val) };
    setForm({ ...form, items });
  };

  const addItem    = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const total = form.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!isAdmin || !payload.targetUserId) delete payload.targetUserId;
      await api.post('/invoices', payload);
      toast.success('Invoice created!');
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted.');
      setInvoices(invoices.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete this invoice.');
    }
  };

  /**
   * Req 2: Pay Invoice — idiot-proof checkout
   * - Guards against double-click with per-invoice `paying` state
   * - Button is disabled immediately (HTML level) before async work starts
   * - Idempotency key lives on the backend (Stripe level)
   */
  const handlePay = async (invoiceId) => {
    if (paying[invoiceId]) return;       // guard: already processing
    setPaying((p) => ({ ...p, [invoiceId]: true }));
    try {
      const res = await api.post(`/invoices/${invoiceId}/pay`);
      // Redirect to Stripe Checkout — user navigates away
      window.location.href = res.data.data.checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start payment. Please try again.');
      setPaying((p) => ({ ...p, [invoiceId]: false })); // unlock only on error
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="animate-slide-in">
        <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button id="create-invoice-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Invoice
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><FileText size={28} color="var(--text-muted)" /></div>
                    <p>No invoices yet. Create your first one!</p>
                  </div>
                </td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv._id}>
                  {/* Req 3: Invoice number is now a clickable link to the detail page */}
                  <td>
                    <Link
                      to={`/invoices/${inv._id}`}
                      style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td>
                    <strong>{inv.clientName}</strong>
                    <div className="text-xs text-muted">{inv.clientEmail}</div>
                  </td>
                  <td><strong>${inv.totalAmount.toLocaleString()} {inv.currency}</strong></td>
                  <td>{statusBadge(inv.status)}</td>
                  <td className="text-sm text-muted">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {/* View detail page */}
                      <button
                        className="btn btn-secondary btn-sm btn-icon"
                        onClick={() => navigate(`/invoices/${inv._id}`)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Req 2: Pay Invoice — disabled immediately on click, spinner shown */}
                      {!isAdmin && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button
                          id={`pay-invoice-${inv._id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePay(inv._id)}
                          disabled={!!paying[inv._id]}
                          title="Pay with Stripe"
                        >
                          {paying[inv._id]
                            ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            : <><CreditCard size={13} /> Pay</>
                          }
                        </button>
                      )}

                      {/* Delete — only for admin, non-paid, non-cancelled */}
                      {isAdmin && inv.status !== 'paid' && (
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          onClick={() => handleDelete(inv._id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Create Invoice Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">New Invoice</h2>
              <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form id="invoice-form" onSubmit={handleCreate}>
              {/* Req 1.2: Admin can assign invoice to a specific client */}
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-target-user">Assign to Client</label>
                  <select
                    id="inv-target-user"
                    className="form-select"
                    value={form.targetUserId}
                    onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                    required
                  >
                    <option value="">— Select a client —</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-client-name">Client Name</label>
                  <input id="inv-client-name" className="form-input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required placeholder="Acme Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-client-email">Client Email</label>
                  <input id="inv-client-email" className="form-input" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} required placeholder="billing@acme.com" />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-currency">Currency</label>
                  <select id="inv-currency" className="form-select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-due-date">Due Date</label>
                  <input id="inv-due-date" className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>

              {/* Line items */}
              <div className="form-group">
                <label className="form-label">Line Items</label>
                {form.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input className="form-input" placeholder="Description" value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} required />
                    <input className="form-input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} style={{ width: '70px' }} />
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="Price" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} style={{ width: '100px' }} />
                    {form.items.length > 1 && <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(idx)}><X size={14} /></button>}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={14} /> Add Item</button>
              </div>

              <div style={{ textAlign: 'right', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total: </span>
                <strong style={{ fontSize: '1.1rem' }}>${total.toLocaleString()} {form.currency}</strong>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inv-notes">Notes</label>
                <textarea id="inv-notes" className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={{ minHeight: '70px' }} />
              </div>

              <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="invoice-save-btn" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
