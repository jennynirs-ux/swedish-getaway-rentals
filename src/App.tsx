import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import VillaHacken from "./pages/VillaHacken";
import LakehouseGetaway from "./pages/LakehouseGetaway";
import VillaGuide from "./pages/VillaGuide";
import LakehouseGuide from "./pages/LakehouseGuide";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/villa-hacken" element={<VillaHacken />} />
            <Route path="/villa-hacken/guide" element={<VillaGuide />} />
            <Route path="/lakehouse-getaway" element={<LakehouseGetaway />} />
            <Route path="/lakehouse-getaway/guide" element={<LakehouseGuide />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
