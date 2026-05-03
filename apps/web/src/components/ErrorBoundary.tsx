'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Open Video error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={container}>
            <div style={box}>
              <span style={icon}>⚠</span>
              <h2 style={title}>Something went wrong</h2>
              <p style={message}>{this.state.error.message}</p>
              <button
                style={button}
                onClick={() => {
                  this.setState({ error: null });
                  window.location.reload();
                }}
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

const container: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100vh', background: 'var(--bg)', color: 'var(--fg)',
};
const box: React.CSSProperties = {
  textAlign: 'center', maxWidth: 400, padding: 40,
};
const icon: React.CSSProperties = { fontSize: 48, display: 'block', marginBottom: 16 };
const title: React.CSSProperties = { fontSize: 18, fontWeight: 600, marginBottom: 8 };
const message: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginBottom: 20, wordBreak: 'break-word' };
const button: React.CSSProperties = {
  padding: '8px 24px', borderRadius: 'var(--radius)', background: 'var(--accent)',
  color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
