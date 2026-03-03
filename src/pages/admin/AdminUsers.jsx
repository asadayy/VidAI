import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminUsers.css';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

function AdminUsers() {
  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]             = useState(1);
  const [toggleLoading, setToggleLoading] = useState(null);
  const searchRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, role: 'user' };
      if (search) params.search = search;
      if (statusFilter === 'active')   params.isActive = true;
      if (statusFilter === 'inactive') params.isActive = false;

      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    searchRef.current?.focus();
  };

  const handleToggleStatus = async (userId, userName, isActive) => {
    setToggleLoading(userId);
    try {
      const res = await adminAPI.toggleUserStatus(userId);
      const nowActive = res.data.data.user.isActive;
      toast.success(`${userName} ${nowActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setToggleLoading(null);
    }
  };

  return (
    <div className="au-page">
      {/* Header */}
      <div className="au-header">
        <div className="au-header-left">
          <div className="au-header-icon"><Users size={18} /></div>
          <div>
            <h1 className="au-title">User Management</h1>
            <p className="au-subtitle">Manage registered customer accounts</p>
          </div>
        </div>
        <span className="au-count-badge">
          {pagination.total} user{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="au-filters">
        <div className="au-tabs">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`au-tab ${statusFilter === key ? 'au-tab-active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="au-search-form" onSubmit={handleSearch}>
          <div className="au-search-wrap">
            <Search size={15} className="au-search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="au-search-input"
            />
            {searchInput && (
              <button type="button" className="au-search-clear" onClick={clearSearch}>
                <X size={13} />
              </button>
            )}
          </div>
          <button type="submit" className="au-search-btn">Search</button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <Loading size="md" />
      ) : users.length === 0 ? (
        <div className="au-empty">
          <Users size={40} strokeWidth={1.2} />
          <h3>{search ? `No results for "${search}"` : 'No users found'}</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={!u.isActive ? 'au-row-disabled' : ''}>
                    <td>
                      <div className="au-user-cell">
                        <div
                          className="au-avatar"
                          style={{ background: stringToColor(u.name || u.email) }}
                        >
                          {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="au-user-name">{u.name || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="au-muted">{u.email}</td>
                    <td>
                      <span className={`au-status-badge ${u.isActive ? 'au-status-active' : 'au-status-inactive'}`}>
                        {u.isActive
                          ? <><CheckCircle2 size={11} /> Active</>
                          : <><XCircle size={11} /> Disabled</>}
                      </span>
                    </td>
                    <td className="au-muted">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="au-muted">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="au-never">Never</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`au-toggle-btn ${u.isActive ? 'au-toggle-deactivate' : 'au-toggle-activate'}`}
                        onClick={() => handleToggleStatus(u._id, u.name, u.isActive)}
                        disabled={toggleLoading === u._id}
                        title={u.isActive ? 'Deactivate account' : 'Activate account'}
                      >
                        {toggleLoading === u._id ? (
                          <span className="au-spinner" />
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="au-pagination">
              <button
                type="button"
                className="au-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} /> Prev
              </button>

              <div className="au-page-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pagination.pages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === '...' ? (
                      <span key={`e${i}`} className="au-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`au-page-num ${page === n ? 'active' : ''}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                className="au-page-btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360},50%,42%)`;
}

export default AdminUsers;
