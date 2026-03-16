import React from 'react';
import { captureError } from '@/lib/errorMonitoring';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Capture error with monitoring system
    if (error instanceof Error) {
      captureError(error, {
        component: 'ErrorBoundary',
        action: 'React component render error'
      });
    } else {
      captureError(new Error(String(error)), {
        component: 'ErrorBoundary',
        action: 'Unknown error caught'
      });
    }

    // Log error details only in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error);
    } else {
      console.error('An error occurred');
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
