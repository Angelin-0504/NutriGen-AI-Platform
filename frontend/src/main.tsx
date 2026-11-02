import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import App from './App.tsx';

// Inside the native mobile app, 'localhost' refers to the mobile device itself.
// Route all '/api/...' calls to the backend server on the local network.
const DEFAULT_BACKEND_URL = 'http://192.168.29.88:8000';

if (Capacitor.isNativePlatform()) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const server = localStorage.getItem('nutrigen_server_url') || DEFAULT_BACKEND_URL;
      const cleanServer = server.replace(/\/+$/, '');
      input = `${cleanServer}${input}`;
    }
    return originalFetch(input, init);
  };
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('NutriGen AI Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: '500px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>NutriGen AI Recovery</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Stored session data needs to be refreshed to display the clinical interface.</p>
            <p style={{ fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '8px', marginBottom: '20px', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Initialization error'}
            </p>
            <button
              onClick={this.handleReset}
              style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
            >
              Reset Session &amp; Launch App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
