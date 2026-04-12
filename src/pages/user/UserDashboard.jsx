import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDashboardBookings, useUpcomingCount, useBudgetSummary } from '../../hooks/queries';
import Loading from '../../components/Loading';
import {
  Calendar,
  Wallet,
  MessageSquare,
  Search,
  ArrowRight,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  Star,
} from 'lucide-react';
import './UserDashboard.css';

/* -- Status config ---------------------------------------- */
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   cls: 'ud-badge--warn',    Icon: Clock        },
  approved:  { label: 'Approved',  cls: 'ud-badge--success', Icon: CheckCircle2 },
  completed: { label: 'Completed', cls: 'ud-badge--info',    Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'ud-badge--danger',  Icon: XCircle      },
  rejected:  { label: 'Rejected',  cls: 'ud-badge--danger',  Icon: XCircle      },
};

/* -- Quick actions ---------------------------------------- */
const ACTIONS = [
  { to: '/user/vendors',  icon: Search,    label: 'Find Vendors',   desc: 'Browse & book top vendors',    cls: 'ud-action--blue'   },
  { to: '/user/budget',   icon: CreditCard,label: 'Budget Planner', desc: 'Track every rupee spent',      cls: 'ud-action--green'  },
  { to: '/user/chat',     icon: Sparkles,  label: 'AI Assistant',   desc: 'Get personalised advice',      cls: 'ud-action--violet' },
  { to: '/user/bookings', icon: Calendar,  label: 'My Bookings',    desc: 'View & manage all bookings',   cls: 'ud-action--rose'   },
];

/* -- Helpers ---------------------------------------------- */
const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (ds) =>
  new Date(ds).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/* -- Component -------------------------------------------- */
const UserDashboard = () => {
  const { user } = useAuth();
  const { data: bookings = [], isLoading: bkLoading } = useDashboardBookings();
  const { data: upcomingCount = 0, isLoading: ucLoading } = useUpcomingCount();
  const { data: budget, isLoading: bdLoading } = useBudgetSummary();
  const loading = bkLoading || ucLoading || bdLoading;

  if (loading) return <Loading fullScreen message="Loading dashboard…" />;

  const totalBudget    = budget?.totalBudget || 0;
  const totalSpent     = budget?.totalSpent || 0;
  const remaining      = totalBudget - totalSpent;
  const spentPct       = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const firstName      = user?.name?.split(' ')[0] || 'there';
  const hour           = new Date().getHours();
  const greeting       = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="ud-page">

      {/* Hero */}
      <div className="ud-hero">
        <div className="ud-hero-glow" />
        <div className="ud-hero-body">
          <div className="ud-avatar">{getInitials(user?.name)}</div>
          <div>
            <p className="ud-greeting">{greeting} 👋</p>
            <h1 className="ud-hero-title">{firstName}</h1>
            <p className="ud-hero-sub">Here&rsquo;s your wedding planning overview</p>
          </div>
        </div>
        <div className="ud-hero-date">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="ud-stats">
        <div className="ud-stat">
          <div className="ud-stat-icon ud-stat-icon--rose"><Calendar size={18} /></div>
          <div className="ud-stat-body">
            <span className="ud-stat-value">{bookings.length}</span>
            <span className="ud-stat-label">Total Bookings</span>
          </div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat-icon ud-stat-icon--green"><TrendingUp size={18} /></div>
          <div className="ud-stat-body">
            <span className="ud-stat-value">{upcomingCount}</span>
            <span className="ud-stat-label">Upcoming Events</span>
          </div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat-icon ud-stat-icon--blue"><Wallet size={18} /></div>
          <div className="ud-stat-body">
            <span className="ud-stat-value ud-stat-value--sm">{fmtCurrency(totalBudget)}</span>
            <span className="ud-stat-label">Total Budget</span>
          </div>
        </div>
        <div className="ud-stat">
          <div className={`ud-stat-icon ${remaining < 0 ? 'ud-stat-icon--red' : 'ud-stat-icon--violet'}`}>
            <CreditCard size={18} />
          </div>
          <div className="ud-stat-body">
            <span className={`ud-stat-value ud-stat-value--sm ${remaining < 0 ? 'ud-value--red' : ''}`}>
              {fmtCurrency(remaining)}
            </span>
            <span className="ud-stat-label">Remaining</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="ud-grid">

        {/* Budget card */}
        <div className="ud-card ud-budget-card">
          <div className="ud-card-stripe" />
          <div className="ud-card-head">
            <div className="ud-card-title-wrap">
              <div className="ud-card-icon ud-card-icon--rose"><Wallet size={16} /></div>
              <span className="ud-card-title">Budget Overview</span>
            </div>
            <Link to="/user/budget" className="ud-link">Details <ArrowRight size={14} /></Link>
          </div>

          <div className="ud-budget-row">
            <div className="ud-budget-col">
              <span className="ud-budget-lbl">Total Budget</span>
              <span className="ud-budget-val">{fmtCurrency(totalBudget)}</span>
            </div>
            <div className="ud-budget-col">
              <span className="ud-budget-lbl">Spent</span>
              <span className="ud-budget-val ud-budget-spent">{fmtCurrency(totalSpent)}</span>
            </div>
            <div className="ud-budget-col">
              <span className="ud-budget-lbl">Remaining</span>
              <span className={`ud-budget-val ${remaining < 0 ? 'ud-value--red' : 'ud-value--green'}`}>
                {fmtCurrency(remaining)}
              </span>
            </div>
          </div>

          <div className="ud-progress-track">
            <div
              className={`ud-progress-fill ${spentPct >= 90 ? 'ud-progress-fill--danger' : ''}`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <div className="ud-progress-labels">
            <span>{spentPct.toFixed(0)}% spent</span>
            <span>{(100 - spentPct).toFixed(0)}% remaining</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="ud-actions-grid">
          {ACTIONS.map(({ to, icon: Icon, label, desc, cls }) => (
            <Link key={to} to={to} className={`ud-action ${cls}`}>
              <div className="ud-action-icon"><Icon size={20} /></div>
              <div className="ud-action-text">
                <span className="ud-action-label">{label}</span>
                <span className="ud-action-desc">{desc}</span>
              </div>
              <ArrowRight size={14} className="ud-action-arrow" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="ud-card ud-bookings-card">
        <div className="ud-card-stripe ud-card-stripe--indigo" />
        <div className="ud-card-head">
          <div className="ud-card-title-wrap">
            <div className="ud-card-icon ud-card-icon--indigo"><Star size={16} /></div>
            <span className="ud-card-title">Recent Bookings</span>
          </div>
          <Link to="/user/bookings" className="ud-btn-outline">View All</Link>
        </div>

        {bookings.length > 0 ? (
          <div className="ud-booking-list">
            {bookings.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              const { Icon: SIcon } = cfg;
              return (
                <div key={b._id} className="ud-booking-row">
                  <div className="ud-booking-avatar">
                    {(b.vendor?.businessName || '?')[0].toUpperCase()}
                  </div>
                  <div className="ud-booking-info">
                    <span className="ud-booking-name">{b.vendor?.businessName || 'Unknown Vendor'}</span>
                    <span className="ud-booking-meta"><Calendar size={12} />{fmtDate(b.eventDate)}</span>
                  </div>
                  <span className={`ud-badge ${cfg.cls}`}>
                    <SIcon size={11} />{cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ud-empty">
            <div className="ud-empty-icon"><Calendar size={30} /></div>
            <p className="ud-empty-text">No bookings yet — start exploring vendors!</p>
            <Link to="/user/vendors" className="ud-btn-primary">
              <Search size={14} /> Browse Vendors
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
