import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Search, Users, UserCheck, UserX } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const { socket } = useSocket();

  const load = async (q = '') => {
    try {
      const res = await api.get(`/admin/users${q ? `?search=${q}` : ''}`);
      setUsers(res.data.data);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => load(search);
    socket.on('user_updated', handleUpdate);
    return () => socket.off('user_updated', handleUpdate);
  }, [socket, search]);

  const toggleStatus = async (user) => {
    setUpdating(user._id);
    try {
      await api.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}.`);
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally { setUpdating(null); }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    load(e.target.value);
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="animate-slide-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users</p>
        </div>
        <div className="search-bar">
          <Search size={15} className="search-icon" />
          <input
            id="admin-user-search"
            placeholder="Search users..."
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Users size={28} color="var(--text-muted)" /></div>
                    <p>No users found.</p>
                  </div>
                </td></tr>
              ) : users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <strong>{u.firstName} {u.lastName}</strong>
                    </div>
                  </td>
                  <td className="text-sm">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-info'}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-gray'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      id={`toggle-user-${u._id}`}
                      className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleStatus(u)}
                      disabled={updating === u._id || u.role === 'admin'}
                      title={u.role === 'admin' ? 'Cannot change admin status' : ''}
                    >
                      {updating === u._id ? (
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : u.isActive ? (
                        <><UserX size={13} /> Deactivate</>
                      ) : (
                        <><UserCheck size={13} /> Activate</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
