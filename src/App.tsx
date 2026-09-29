import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PropertyPage from "./pages/PropertyPage";

// Everything but the home and property pages loads on demand, so guests
// don't download the admin, host dashboard and shop code
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const PropertyGuide = lazy(() => import("./pages/PropertyGuide"));
const PropertyGuestbookPage = lazy(() => import("./pages/PropertyGuestbookPage"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const HostApplication = lazy(() => import("./pages/HostApplication"));
const HostDashboard = lazy(() => import("./components/host/HostDashboard"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const BookNow = lazy(() => import("./pages/BookNow"));
const Profile = lazy(() => import("./pages/Profile"));
const FirstTimeInSweden = lazy(() => import("./pages/FirstTimeInSweden"));
const LakeGuide = lazy(() => import("./pages/LakeGuide"));
const PricingGuide = lazy(() => import("./pages/PricingGuide"));
const BecomeHost = lazy(() => import("./pages/BecomeHost"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* Legacy short links */}
                <Route path="/villa-hacken" element={<Navigate to="/property/lakefront-retreat" replace />} />
                <Route path="/villa-hacken/guide" element={<Navigate to="/property/lakefront-retreat/guide" replace />} />
                <Route path="/lakehouse-getaway" element={<Navigate to="/property/lakehouse-getaway" replace />} />
                <Route path="/lakehouse-getaway/guide" element={<Navigate to="/property/lakehouse-getaway/guide" replace />} />
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
                {/* Were empty pages; photos and amenities are on each property page */}
                <Route path="/gallery" element={<Navigate to="/" replace />} />
                <Route path="/amenities" element={<Navigate to="/" replace />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/property/:id/guestbook" element={<PropertyGuestbookPage />} />
                <Route path="/book-now" element={<BookNow />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/first-time-in-sweden" element={<FirstTimeInSweden />} />
                <Route path="/stora-harsjon-lerum" element={<LakeGuide />} />
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
