import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  Server,
  Database,
  Bot,
  RefreshCw,
  Clock,
  MemoryStick,
  HardDrive,
  Layers,
  CalendarClock,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminSystemHealth.css';

const SERVICE_CONFIG = [
  {
    key: 'server',
    label: 'API Server',
    description: 'Express.js backend',
    icon: Server,
    okValue: 'running',
  },
  {
    key: 'database',
    label: 'MongoDB Atlas',
    description: 'Primary database',
    icon: Database,
    okValue: 'connected',
  },
  {
    key: 'aiService',
    label: 'AI Service',
    description: 'FastAPI / Gemini',
    icon: Bot,
    okValue: 'healthy',
  },
];

function AdminSystemHealth() {
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await adminAPI.getSystemHealth();
      setHealth(res.data.data);
      setLastFetched(new Date());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let val = bytes;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(1)} ${units[i]}`;
  };

  const isOk = (key, value) => {
    const cfg = SERVICE_CONFIG.find((s) => s.key === key);
    return cfg ? value === cfg.okValue : false;
  };

  const allHealthy = health &&
    isOk('server', health.server) &&
    isOk('database', health.database) &&
    isOk('aiService', health.aiService);

  const heapPct = health?.memoryUsage
    ? Math.round((health.memoryUsage.heapUsed / health.memoryUsage.heapTotal) * 100)
    : 0;

  if (loading) return <Loading size="lg" fullScreen />;

  return (
    <div className="ash-page">
      {/* Header */}
      <div className="ash-header">
        <div className="ash-header-left">
          <div className="ash-header-icon">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="ash-title">System Health</h1>
            <p className="ash-subtitle">Live status of all platform services and server metrics</p>
          </div>
        </div>
        <div className="ash-header-right">
          {lastFetched && (
            <span className="ash-last-checked">
              <CalendarClock size={12} />
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            className="ash-refresh-btn"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'ash-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      <div className={`ash-banner ${allHealthy ? 'ash-banner-ok' : 'ash-banner-warn'}`}>
        <ShieldCheck size={16} />
        <span>
          {allHealthy
            ? 'All systems are operational'
            : 'One or more services need attention'}
        </span>
      </div>

      {/* Service cards */}
      <div className="ash-services">
        {SERVICE_CONFIG.map(({ key, label, description, icon: Icon, okValue }) => {
          const value  = health?.[key] ?? 'unknown';
          const ok     = value === okValue;
          return (
            <div key={key} className={`ash-service-card ${ok ? 'ash-card-ok' : 'ash-card-err'}`}>
              <div className="ash-service-top">
                <div className={`ash-service-icon ${ok ? 'ash-icon-ok' : 'ash-icon-err'}`}>
                  <Icon size={20} />
                </div>
                <span className={`ash-pulse-dot ${ok ? 'ash-dot-ok' : 'ash-dot-err'}`} />
              </div>
              <div className="ash-service-name">{label}</div>
              <div className="ash-service-desc">{description}</div>
              <div className={`ash-service-badge ${ok ? 'ash-badge-ok' : 'ash-badge-err'}`}>
                {value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics grid */}
      <div className="ash-metrics-grid">
        {/* Uptime card */}
        <div className="ash-metric-card">
          <div className="ash-metric-header">
            <div className="ash-metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Clock size={15} />
            </div>
            <span className="ash-metric-label">Server Uptime</span>
          </div>
          <div className="ash-metric-value">{formatUptime(health?.uptime)}</div>
          <div className="ash-metric-sub">Since last restart</div>
        </div>

        {/* Heap usage card with progress bar */}
        <div className="ash-metric-card ash-metric-wide">
          <div className="ash-metric-header">
            <div className="ash-metric-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <MemoryStick size={15} />
            </div>
            <span className="ash-metric-label">Heap Memory</span>
            <span className="ash-metric-pct">{heapPct}%</span>
          </div>
          <div className="ash-progress-bar">
            <div
              className="ash-progress-fill"
              style={{
                width: `${heapPct}%`,
                background: heapPct > 85 ? '#ef4444' : heapPct > 65 ? '#f59e0b' : '#3b82f6',
              }}
            />
          </div>
          <div className="ash-metric-row">
            <span className="ash-metric-sub">
              Used: <strong>{formatBytes(health?.memoryUsage?.heapUsed)}</strong>
            </span>
            <span className="ash-metric-sub">
              Total: <strong>{formatBytes(health?.memoryUsage?.heapTotal)}</strong>
            </span>
          </div>
        </div>

        {/* RSS Memory */}
        <div className="ash-metric-card">
          <div className="ash-metric-header">
            <div className="ash-metric-icon" style={{ background: '#fdf4ff', color: '#9333ea' }}>
              <HardDrive size={15} />
            </div>
            <span className="ash-metric-label">RSS Memory</span>
          </div>
          <div className="ash-metric-value">{formatBytes(health?.memoryUsage?.rss)}</div>
          <div className="ash-metric-sub">Resident Set Size</div>
        </div>

        {/* External memory */}
        <div className="ash-metric-card">
          <div className="ash-metric-header">
            <div className="ash-metric-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <Layers size={15} />
            </div>
            <span className="ash-metric-label">External Memory</span>
          </div>
          <div className="ash-metric-value">{formatBytes(health?.memoryUsage?.external)}</div>
          <div className="ash-metric-sub">C++ objects bound to JS</div>
        </div>

        {/* Last checked */}
        <div className="ash-metric-card">
          <div className="ash-metric-header">
            <div className="ash-metric-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <CalendarClock size={15} />
            </div>
            <span className="ash-metric-label">Server Timestamp</span>
          </div>
          <div className="ash-metric-value ash-metric-value-sm">
            {health?.timestamp
              ? new Date(health.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—'}
          </div>
          <div className="ash-metric-sub">UTC from server</div>
        </div>
      </div>
    </div>
  );
}

export default AdminSystemHealth;

