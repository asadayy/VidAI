import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI } from '../../api/bookings';
import { budgetAPI } from '../../api/budget';
import Loading from '../../components/Loading';
import { 
  Calendar, 
  Wallet, 
  MessageSquare, 
  Search, 
  ArrowRight, 
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, budgetRes] = await Promise.all([
          bookingAPI.getMyBookings({ limit: 3 }).catch(() => ({ data: { data: { bookings: [] } } })),
          budgetAPI.getMine().catch(() => ({ data: null }))
        ]);

        setBookings(bookingsRes.data.data.bookings || []);
        setBudget(budgetRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'badge-warning',
      approved: 'badge-success',
      cancelled: 'badge-danger',
      completed: 'badge-info',
      rejected: 'badge-danger'
    };
    return <span className={`status-badge ${styles[status] || 'badge-default'}`}>{status}</span>;
  };

  if (loading) return <Loading fullScreen message="Loading dashboard..." />;

  // Calculate budget stats
  const totalBudget = budget?.totalBudget || 0;
  const totalSpent = budget?.items?.reduce((sum, item) => sum + (item.spentAmount || 0), 0) || 0;
  const remaining = totalBudget - totalSpent;

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name}!</h1>
          <p className="subtitle">Here's what's happening with your wedding planning.</p>
        </div>
        <div className="header-date">
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Budget Status Card */}
        <div className="dashboard-card budget-card">
          <div className="card-header">
            <h3><Wallet className="icon" size={20} /> Budget Overview</h3>
            <Link to="/budget" className="btn-link">View Details <ArrowRight size={16} /></Link>
          </div>
          <div className="budget-stats">
            <div className="budget-stat">
              <span className="label">Total Budget</span>
              <span className="value">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="budget-stat">
              <span className="label">Spent</span>
              <span className="value">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="budget-stat">
              <span className="label">Remaining</span>
              <span className={`value ${remaining < 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>
          <div className="budget-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="quick-actions-grid">
          <Link to="/vendors" className="action-card">
            <div className="action-icon search-icon">
              <Search size={24} />
            </div>
            <span>Find Vendors</span>
          </Link>
          <Link to="/budget" className="action-card">
            <div className="action-icon budget-icon">
              <CreditCard size={24} />
            </div>
            <span>Update Budget</span>
          </Link>
          <Link to="/chat" className="action-card">
            <div className="action-icon ai-icon">
              <MessageSquare size={24} />
            </div>
            <span>Chat with AI</span>
          </Link>
        </div>
      </div>

      {/* Recent Bookings List */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Recent Bookings</h3>
          <Link to="/bookings" className="btn-outline">View All</Link>
        </div>
        
        {bookings.length > 0 ? (
          <div className="bookings-list">
            {bookings.map(booking => (
              <div key={booking._id} className="booking-item">
                <div className="booking-info">
                  <div className="vendor-name">{booking.vendor?.businessName || 'Unknown Vendor'}</div>
                  <div className="booking-date">
                    <Calendar size={14} />
                    {formatDate(booking.eventDate)}
                  </div>
                </div>
                <div className="booking-status">
                  {getStatusBadge(booking.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Calendar size={48} className="empty-icon" />
            <p>No bookings yet. Start exploring vendors!</p>
            <Link to="/vendors" className="btn-primary">Browse Vendors</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
