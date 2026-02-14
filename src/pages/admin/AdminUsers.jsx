import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminUsers.css';

const ROLE_FILTERS = [
  { key: '', label: 'All Roles' },
  { key: 'user', label: 'Users' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'admin', label: 'Admins' },
];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [toggleLoading, setToggleLoading] = useState(null); // user id being toggled

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;

      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleToggleStatus = async (userId, userName) => {
    setToggleLoading(userId);
    try {
      const res = await adminAPI.toggleUserStatus(userId);
      const isActive = res.data.data.user.isActive;
      toast.success(`${userName} ${isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle user status');
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>User Management</h1>
        <span className="admin-total-badge">{pagination.total} user{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="admin-user-filters">
        <div className="admin-status-tabs">
          {ROLE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`admin-tab ${roleFilter === key ? 'admin-tab-active' : ''}`}
              onClick={() => setRoleFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="admin-search-form" onSubmit={handleSearch}>
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <Loading size="md" />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h3>No users found</h3>
          <p>{search ? `No results for "${search}"` : 'Try changing your filters.'}</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={!u.isActive ? 'admin-user-disabled' : ''}>
                    <td className="admin-user-cell">
                      <div className="admin-avatar-sm">
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      {u.name}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${roleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isActive ? 'admin-btn-reject' : 'admin-btn-approve'}`}
                          onClick={() => handleToggleStatus(u._id, u.name)}
                          disabled={toggleLoading === u._id}
                          title={u.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {toggleLoading === u._id ? (
                            '...'
                          ) : u.isActive ? (
                            <><UserX size={14} /> Deactivate</>
                          ) : (
                            <><UserCheck size={14} /> Activate</>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="admin-page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function roleBadge(role) {
  const map = { admin: 'info', vendor: 'warning', user: 'neutral' };
  return map[role] || 'neutral';
}

export default AdminUsers;
