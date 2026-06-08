import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f3f4f6',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <h1 style={{ color: '#dc2626', marginBottom: '10px' }}>⚠️ Application Error</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Something went wrong. Please check the browser console for details.
            </p>
            {this.state.error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                padding: '15px',
                textAlign: 'left',
                marginBottom: '20px',
                maxHeight: '300px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#7f1d1d',
              }}>
                <strong>Error:</strong>
                <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <strong style={{ marginTop: '10px', display: 'block' }}>Component Stack:</strong>
                    <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
