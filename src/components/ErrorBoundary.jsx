import React from 'react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="#D7385E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.message}>
            An unexpected error occurred. You can try again or go back to the dashboard.
          </p>
          <div style={styles.actions}>
            <button style={styles.btnPrimary} onClick={this.reset}>
              Try Again
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => { this.reset(); this.props.onGoHome?.(); }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }) {
  let navigate;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  return (
    <ErrorBoundaryInner onGoHome={() => navigate?.('/')}>
      {children}
    </ErrorBoundaryInner>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '2rem',
  },
  card: {
    textAlign: 'center',
    maxWidth: 420,
    padding: '2.5rem 2rem',
    borderRadius: 16,
    background: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #f0eff2',
  },
  iconWrap: {
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 0.5rem',
  },
  message: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.5,
    margin: '0 0 1.5rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '0.6rem 1.5rem',
    borderRadius: 10,
    border: 'none',
    background: '#D7385E',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '0.6rem 1.5rem',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};
