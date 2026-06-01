import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Webhook, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const statusBadge = (status) => {
  const map = { received: 'badge-info', processed: 'badge-success', failed: 'badge-danger' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
};

export default function AdminWebhooks() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const load = () => {
    api.get('/admin/webhooks')
      .then((res) => setEvents(res.data.data))
      .catch(() => toast.error('Failed to load webhook events.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load();
    socket.on('webhook_received', handleUpdate);
    return () => socket.off('webhook_received', handleUpdate);
  }, [socket]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhook Events</h1>
          <p className="page-subtitle">{events.length} events logged</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>User</th>
                <th>Status</th>
                <th>Signature</th>
                <th>Received</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Webhook size={28} color="var(--text-muted)" /></div>
                    <p>No webhook events yet.</p>
                  </div>
                </td></tr>
              ) : events.map((ev) => (
                <tr key={ev._id}>
                  <td>
                    <code style={{ fontSize: '0.78rem', background: 'var(--bg-elevated)', padding: '0.2rem 0.5rem', borderRadius: 4, color: 'var(--info-text)' }}>
                      {ev.eventType}
                    </code>
                  </td>
                  <td className="text-sm">
                    {ev.userId ? `${ev.userId.firstName} ${ev.userId.lastName}` : <span className="text-muted">Unknown</span>}
                  </td>
                  <td>{statusBadge(ev.status)}</td>
                  <td>
                    {ev.signatureValid ? (
                      <span style={{ color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <CheckCircle size={13} /> Valid
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <XCircle size={13} /> Invalid
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-muted">{new Date(ev.createdAt).toLocaleString()}</td>
                  <td className="text-xs text-muted">{ev.processingError || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
