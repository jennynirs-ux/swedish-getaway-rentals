import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import BookingSuccess from "./pages/BookingSuccess";
import PropertyGuide from "./pages/PropertyGuide";
import PropertyGuestbookPage from "./pages/PropertyGuestbookPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import HostApplication from "./pages/HostApplication";
import HostDashboard from "./components/host/HostDashboard";
import PropertyPage from "./pages/PropertyPage";
import OrderSuccess from "./pages/OrderSuccess";
import ProductDetail from "./pages/ProductDetail";
import Gallery from "./pages/Gallery";
import Amenities from "./pages/Amenities";
import Contact from "./pages/Contact";
import BookNow from "./pages/BookNow";
import Profile from "./pages/Profile";
import FirstTimeInSweden from "./pages/FirstTimeInSweden";
import PricingGuide from "./pages/PricingGuide";
import BecomeHost from "./pages/BecomeHost";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
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
            <Route path="/admin" element={<Admin />} />
            <Route path="/host-application" element={<HostApplication />} />
            <Route path="/host-dashboard" element={<HostDashboard />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/amenities" element={<Amenities />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/property/:id/guestbook" element={<PropertyGuestbookPage />} />
            <Route path="/book-now" element={<BookNow />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/first-time-in-sweden" element={<FirstTimeInSweden />} />
            <Route path="/pricing-guide" element={<PricingGuide />} />
            <Route path="/become-host" element={<BecomeHost />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TooltipProvider>
        </CartProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;