/**
 * IMP-013: Routing System Architecture
 *
 * CURRENT PRODUCTION ROUTER (Active):
 * This file is the main entry point for the application routing system.
 * Uses React Router (client-side) with Vite as the build tool.
 *
 * Dual routing system in transition:
 * - This file (src/App.tsx): CURRENT PRODUCTION
 * - Target: app/ directory (Next.js App Router)
 *
 * TODO: Migrate to app/layout.tsx (Next.js)
 * See also: app/layout.tsx (TODO reference to this file)
 *
 * All new pages and features should be added here until migration is complete.
 * The app/ directory is prepared but not yet active.
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { lazy, Suspense } from "react";

// Immediate load - critical pages
import Index from "./pages/Index";
import PropertyPage from "./pages/PropertyPage";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load - secondary pages
const Shop = lazy(() => import("./pages/Shop"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const PropertyGuide = lazy(() => import("./pages/PropertyGuide"));
const PropertyGuestbookPage = lazy(() => import("./pages/PropertyGuestbookPage"));
const Admin = lazy(() => import("./pages/Admin"));
const HostApplication = lazy(() => import("./pages/HostApplication"));
const HostDashboard = lazy(() => import("./components/host/HostDashboard"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Amenities = lazy(() => import("./pages/Amenities"));
const Contact = lazy(() => import("./pages/Contact"));
const BookNow = lazy(() => import("./pages/BookNow"));
const Profile = lazy(() => import("./pages/Profile"));
const FirstTimeInSweden = lazy(() => import("./pages/FirstTimeInSweden"));
const PricingGuide = lazy(() => import("./pages/PricingGuide"));
const BecomeHost = lazy(() => import("./pages/BecomeHost"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Fallback component for lazy loaded pages
const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-center">
      <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/villa-hacken" element={<PropertyPage />} />
                <Route path="/villa-hacken/guide" element={<PropertyGuide />} />
                <Route path="/lakehouse-getaway" element={<PropertyPage />} />
                <Route path="/lakehouse-getaway/guide" element={<PropertyGuide />} />
                <Route path="/property/:id" element={<PropertyPage />} />
                <Route path="/property/:id/guide" element={<PropertyGuide />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/host-application" element={
                  <ProtectedRoute>
                    <HostApplication />
                  </ProtectedRoute>
                } />
                <Route path="/host-dashboard" element={
                  <ProtectedRoute requireHost>
                    <HostDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/amenities" element={<Amenities />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/property/:id/guestbook" element={<PropertyGuestbookPage />} />
                <Route path="/book-now" element={<BookNow />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/first-time-in-sweden" element={<FirstTimeInSweden />} />
                <Route path="/pricing-guide" element={<PricingGuide />} />
                <Route path="/become-host" element={<BecomeHost />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </ErrorBoundary>
          </TooltipProvider>
        </CartProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
