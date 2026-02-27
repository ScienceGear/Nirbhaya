import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import PrivacyTerms from "@/pages/PrivacyTerms";
import FAQ from "@/pages/FAQ";
import Dashboard from "@/pages/Dashboard";
import SOS from "@/pages/SOS";
import Report from "@/pages/Report";
import Police from "@/pages/Police";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Navbar />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/privacy" element={<PrivacyTerms />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sos" element={<SOS />} />
                <Route path="/report" element={<Report />} />
                <Route path="/police" element={<Police />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
