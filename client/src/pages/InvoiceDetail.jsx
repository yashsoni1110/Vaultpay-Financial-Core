import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Download, CreditCard, FileText,
  Calendar, DollarSign, User, Mail, Hash, ClipboardList,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

/* Status helpers */
const STATUS_META = {
  paid:      { badge: 'badge-success', label: 'Paid',      accent: 'var(--success-text)' },
  sent:      { badge: 'badge-info',    label: 'Sent',      accent: 'var(--info-text)' },
  draft:     { badge: 'badge-gray',    label: 'Draft',     accent: 'var(--text-muted)' },
  overdue:   { badge: 'badge-danger',  label: 'Overdue',   accent: 'var(--danger-text)' },
  cancelled: { badge: 'badge-danger',  label: 'Cancelled', accent: 'var(--danger-text)' },
};

const fmt = (n, currency = 'USD') =>
  `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const [invoice, setInvoice]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { socket } = useSocket();

  /* Load invoice */
  const load = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice not found.');
      navigate('/invoices');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedInvoice) => {
      if (updatedInvoice._id === id) {
        load();
      }
    };
    socket.on('invoice_updated', handleUpdate);
    return () => socket.off('invoice_updated', handleUpdate);
  }, [socket, id]);

  /* Handle Stripe return */
  const hasToasted = useRef(false);
  
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus && !hasToasted.current) {
      if (paymentStatus === 'success') {
        toast.success('Payment successful! Your invoice has been marked as paid.');
      } else if (paymentStatus === 'cancelled') {
        toast.error('Payment was cancelled. You can try again anytime.');
      }
      hasToasted.current = true;
      
      // Remove query param to prevent re-triggering
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('payment');
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [searchParams, navigate]);

  /* Pay Invoice */
  const handlePay = async () => {
    if (paying) return;            // guard: already processing
    setPaying(true);               // lock button immediately
    try {
      const res = await api.post(`/invoices/${id}/pay`);
      window.location.href = res.data.data.checkoutUrl;
      // Do NOT setPaying(false) on success — user is navigating away to Stripe
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start payment. Please try again.');
      setPaying(false);            // only unlock on error
    }
  };

  /* Download PDF */
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',    // CRITICAL: tells Axios to return binary, not string
      });

      // Trigger native Save File dialog
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to download PDF. Please try again.');
    } finally { setDownloading(false); }
  };

  /* Loading / error states */
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!invoice) return null;

  const meta     = STATUS_META[invoice.status] || STATUS_META.draft;
  const canPay   = !isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled';
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';

  /* Render */
  return (
    <div className="animate-slide-in">
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.5rem' }}>
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="page-subtitle">View and manage this invoice</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Download PDF button */}
          <button
            id="download-pdf-btn"
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading
              ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              : <><Download size={16} /> Download PDF</>
            }
          </button>

          {/* Pay Invoice button — disabled instantly on click */}
          {canPay && (
            <button
              id="pay-invoice-btn"
              className="btn btn-primary"
              onClick={handlePay}
              disabled={paying}
            >
              {paying
                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                : <><CreditCard size={16} /> Pay Invoice</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="invoice-layout">

        {/* Main invoice document */}
        <div>
          {/* Invoice header card */}
          <div className="card" style={{ marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            {/* Accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${meta.accent}, transparent)`,
            }} />

            <div className="flex items-center justify-between" style={{ paddingTop: '0.5rem' }}>
              {/* VaultPay branding */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <FileText size={18} color="var(--primary-400)" />
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>VaultPay</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nexus Corporate Services</p>
              </div>

              {/* Status badge */}
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${meta.badge}`} style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem' }}>
                  {meta.label}
                </span>
                {isOverdue && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--danger-text)', marginTop: '0.4rem', fontWeight: 600 }}>
                    ⚠ Past due date
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To + Dates */}
          <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <span className="card-subtitle">Bill To</span>
              </div>
              <div className="flex items-center gap-2" style={{ marginBottom: '0.4rem' }}>
                <User size={14} color="var(--text-muted)" />
                <strong style={{ fontSize: '0.95rem' }}>{invoice.clientName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{invoice.clientEmail}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <span className="card-subtitle">Invoice Details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="flex items-center gap-2">
                  <Hash size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{invoice.invoiceNumber}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Issued: {new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} color={isOverdue ? 'var(--danger-text)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.82rem', color: isOverdue ? 'var(--danger-text)' : 'var(--text-muted)' }}>
                      Due: {new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="card" style={{ padding: 0, marginBottom: '1.25rem' }}>
            <div style={{ padding: '1.25rem 1.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <ClipboardList size={16} color="var(--primary-400)" />
                <span className="card-title">Line Items</span>
              </div>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => {
                    const lineTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={idx}>
                        <td><strong>{item.description}</strong></td>
                        <td style={{ textAlign: 'center', color: 'var(--text-primary)' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {invoice.currency} {Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>{invoice.currency} {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <span className="card-title">Notes</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: total + payment */}
        <div>
          {/* Total card */}
          <div className="card" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <div className="flex items-center gap-2" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--info-bg)', border: '1px solid var(--info-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={18} color="var(--info-text)" />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Total Due
            </div>
            <div style={{
              fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
              color: invoice.status === 'paid' ? 'var(--success-text)' : 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}>
              {fmt(invoice.totalAmount, invoice.currency)}
            </div>
            <span className={`badge ${meta.badge}`}>{meta.label}</span>
          </div>

          {/* Payment action card */}
          {canPay && (
            <div className="card" style={{
              border: '1px solid var(--primary-600)',
              background: 'rgba(37,99,235,0.06)',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Pay this invoice securely via Stripe. Your card details are never stored on our servers.
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handlePay}
                disabled={paying}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                {paying
                  ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : <><CreditCard size={16} /> Pay {fmt(invoice.totalAmount, invoice.currency)}</>
                }
              </button>
            </div>
          )}

          {/* Paid confirmation */}
          {invoice.status === 'paid' && (
            <div className="card" style={{
              border: '1px solid var(--success-border)',
              background: 'var(--success-bg)',
              textAlign: 'center',
              marginBottom: '1.25rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--success-text)', marginBottom: '0.25rem' }}>
                Payment Complete
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                This invoice has been paid in full.
              </div>
            </div>
          )}

          {/* Download PDF card */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Download a professionally formatted PDF receipt for your records.
            </div>
            <button
              id="download-pdf-sidebar-btn"
              className="btn btn-secondary w-full"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{ justifyContent: 'center', width: '100%' }}
            >
              {downloading
                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                : <><Download size={16} /> Download PDF</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
