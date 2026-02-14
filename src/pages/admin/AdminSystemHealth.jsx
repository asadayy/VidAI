import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import Loading from '../../components/Loading';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminSystemHealth.css';

function AdminSystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await adminAPI.getSystemHealth();
      setHealth(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds) => {
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
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
  };

  const statusIcon = (status) => {
    if (status === 'connected' || status === 'running' || status === 'healthy') {
      return <Wifi size={16} className="health-icon-ok" />;
    }
    return <WifiOff size={16} className="health-icon-err" />;
  };

  if (loading) return <Loading size="lg" fullScreen />;

  return (
    <div className="admin-health">
      <div className="page-header">
        <h1>System Health</h1>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? 'health-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Service status */}
      <div className="health-services">
        <div className="health-service-card">
          <div className="health-service-header">
            <Server size={20} />
            <span>API Server</span>
          </div>
          <div className="health-service-status">
            {statusIcon(health?.server)}
            <span className={`health-status-text health-${health?.server === 'running' ? 'ok' : 'err'}`}>
              {health?.server || 'unknown'}
            </span>
          </div>
        </div>

        <div className="health-service-card">
          <div className="health-service-header">
            <Database size={20} />
            <span>MongoDB Atlas</span>
          </div>
          <div className="health-service-status">
            {statusIcon(health?.database)}
            <span className={`health-status-text health-${health?.database === 'connected' ? 'ok' : 'err'}`}>
              {health?.database || 'unknown'}
            </span>
          </div>
        </div>

        <div className="health-service-card">
          <div className="health-service-header">
            <Activity size={20} />
            <span>AI Service</span>
          </div>
          <div className="health-service-status">
            {statusIcon(health?.aiService)}
            <span className={`health-status-text health-${health?.aiService === 'healthy' ? 'ok' : 'err'}`}>
              {health?.aiService || 'unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="health-details">
        <div className="card">
          <div className="card-header">
            <h3>Server Details</h3>
          </div>
          <div className="health-info-grid">
            <div className="health-info-item">
              <Clock size={16} />
              <div>
                <span className="health-info-label">Uptime</span>
                <span className="health-info-value">{formatUptime(health?.uptime || 0)}</span>
              </div>
            </div>
            <div className="health-info-item">
              <Cpu size={16} />
              <div>
                <span className="health-info-label">Heap Used</span>
                <span className="health-info-value">{formatBytes(health?.memoryUsage?.heapUsed)}</span>
              </div>
            </div>
            <div className="health-info-item">
              <HardDrive size={16} />
              <div>
                <span className="health-info-label">Heap Total</span>
                <span className="health-info-value">{formatBytes(health?.memoryUsage?.heapTotal)}</span>
              </div>
            </div>
            <div className="health-info-item">
              <HardDrive size={16} />
              <div>
                <span className="health-info-label">RSS Memory</span>
                <span className="health-info-value">{formatBytes(health?.memoryUsage?.rss)}</span>
              </div>
            </div>
            <div className="health-info-item">
              <HardDrive size={16} />
              <div>
                <span className="health-info-label">External</span>
                <span className="health-info-value">{formatBytes(health?.memoryUsage?.external)}</span>
              </div>
            </div>
            <div className="health-info-item">
              <Clock size={16} />
              <div>
                <span className="health-info-label">Last Checked</span>
                <span className="health-info-value">
                  {health?.timestamp
                    ? new Date(health.timestamp).toLocaleString()
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSystemHealth;
