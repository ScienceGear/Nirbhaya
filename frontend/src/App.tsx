import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
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
import AdminDashboard from "@/pages/AdminDashboard";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

/** Protect routes — allows access if user is logged in OR browsing as guest */
function ProtectedRoute({ children, allowGuest = false }: { children: ReactNode; allowGuest?: boolean }) {
  const { user, loading, isGuest } = useAuth();
  if (loading) return null; // wait for auth check
  if (user) return <>{children}</>;
  if (isGuest && allowGuest) return <>{children}</>;
  return <Navigate to="/login" replace />;
}

/** Restrict a route to a specific role */
function RoleRoute({ children, role }: { children: ReactNode; role: string }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Hide the top navbar on full-screen map pages
function AppShell() {
  const { pathname } = useLocation();
  const hideTopNav = ["/dashboard", "/sos", "/report", "/police", "/settings", "/guardian", "/admin"].some(
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
        <Route path="/dashboard" element={<ProtectedRoute allowGuest><Dashboard /></ProtectedRoute>} />
        <Route path="/sos" element={<ProtectedRoute><SOS /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute allowGuest><Report /></ProtectedRoute>} />
        <Route path="/police" element={<ProtectedRoute allowGuest><Police /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/guardian" element={<RoleRoute role="guardian"><GuardianDashboard /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
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
