import React from 'react';
import { langOfPath, type Lang } from '@/i18n';

const COPY: Record<Lang, { title: string; text: string; button: string }> = {
  en: { title: 'Something went wrong', text: 'An unexpected error occurred. Please try refreshing the page.', button: 'Refresh Page' },
  sv: { title: 'Något gick fel', text: 'Ett oväntat fel inträffade. Prova att ladda om sidan.', button: 'Ladda om sidan' },
  de: { title: 'Etwas ist schiefgelaufen', text: 'Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.', button: 'Seite neu laden' },
};

/** The error page sits outside the routes: its language comes from the address (the host panel is Swedish) */
const errorLang = (): Lang => {
  const path = window.location.pathname;
  return /^\/(host-dashboard|host-application|bli-vard)(\/|$)/.test(path) ? 'sv' : langOfPath(path);
};

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
    // Log error details only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error);
    } else {
      console.error('An error occurred');
    }
  }

  render() {
    if (this.state.hasError) {
      const t = COPY[errorLang()];
      return this.props.fallback ?? (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t.title}</h1>
            <p className="text-muted-foreground mb-6">{t.text}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {t.button}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
