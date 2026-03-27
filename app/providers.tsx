'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { LocaleProvider } from '@/i18n/useLocale';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // BrowserRouter is kept temporarily for components using react-router-dom.
  // TODO: Incrementally migrate components to next/navigation, then remove BrowserRouter.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LocaleProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                {children}
              </TooltipProvider>
            </CartProvider>
          </LocaleProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
