import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            fontSize: '2rem',
          }}>
            ⚠
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#111827' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem', textAlign: 'center', maxWidth: 480 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <div style={{
              color: '#b91c1c',
              fontSize: '0.875rem',
              background: '#fef2f2',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              maxWidth: 600,
              overflow: 'auto',
              marginTop: '0.75rem',
              border: '1px solid #fecaca',
            }}>
              <details>
                <summary>Technical details</summary>
                <pre>
                  {process.env.NODE_ENV !== 'production'
                    ? this.state.error.message
                    : 'An unexpected error occurred. Please try refreshing the page.'}
                </pre>
              </details>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.65rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#111827',
              color: 'white',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
