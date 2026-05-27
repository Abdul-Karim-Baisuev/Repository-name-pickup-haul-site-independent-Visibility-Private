import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteDialogProvider } from "@/components/quote/QuoteDialogContext";
import QuoteDialog from "@/components/quote/QuoteDialog";
import AutocompleteStatsOverlay from "@/components/quote/AutocompleteStatsOverlay";
import Admin from "./pages/Admin.tsx";
import AdminIntegrations from "./pages/AdminIntegrations.tsx";
import AdminVerification from "./pages/AdminVerification.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import RequireAdmin from "./components/admin/RequireAdmin";
import Auth from "./pages/Auth.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import PaymentCanceled from "./pages/PaymentCanceled.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import RequestStatus from "./pages/RequestStatus.tsx";
import Portal from "./pages/Portal.tsx";
import Driver from "./pages/Driver.tsx";
import DriverTracking from "./pages/DriverTracking.tsx";
import TrackByToken from "./pages/TrackByToken.tsx";
import ServicePage from "./pages/ServicePage.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import QuotePage from "./pages/QuotePage.tsx";
import GalleryPage from "./pages/GalleryPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import PayPage from "./pages/PayPage.tsx";
import PayByToken from "./pages/PayByToken.tsx";
import ScrollToHash from "./components/ScrollToHash";
import BackToTop from "./components/BackToTop";
import SectionTopButton from "./components/SectionTopButton";
import ChatWidget from "./components/ChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QuoteDialogProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToHash />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="/admin/integrations" element={<RequireAdmin><AdminIntegrations /></RequireAdmin>} />
            <Route path="/admin/verification" element={<RequireAdmin><AdminVerification /></RequireAdmin>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/services/:slug" element={<ServicePage />} />
            <Route path="/quote" element={<QuotePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pay" element={<PayPage />} />
            <Route path="/pay/:token" element={<PayByToken />} />
            <Route path="/status" element={<RequestStatus />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/driver" element={<Driver />} />
            <Route path="/driver/tracking" element={<DriverTracking />} />
            <Route path="/track/:token" element={<TrackByToken />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BackToTop />
          <SectionTopButton />
          <ChatWidget />
        </BrowserRouter>
        <QuoteDialog />
        {import.meta.env.DEV && <AutocompleteStatsOverlay />}
      </QuoteDialogProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
