import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import GuardianDashboard from "@/pages/GuardianDashboard";

const queryClient = new QueryClient();

// Hide the top navbar on full-screen map pages
function AppShell() {
  const { pathname } = useLocation();
  const hideTopNav = ["/dashboard", "/sos", "/report", "/police", "/settings", "/guardian"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  return (
    <>
      {!hideTopNav && <Navbar />}
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
        <Route path="/guardian" element={<GuardianDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
