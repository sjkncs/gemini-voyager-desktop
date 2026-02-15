import React, { Component } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary to prevent white-screen crashes.
 * Wraps the Popup and Content Script React roots to catch render errors
 * and display a recoverable fallback UI instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[Gemini Voyager] React render error:', error, errorInfo.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#666',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Something went wrong
          </p>
          <p style={{ fontSize: '12px', marginBottom: '16px', color: '#888' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: '#f5f5f5',
              cursor: 'pointer',
              color: '#333',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
