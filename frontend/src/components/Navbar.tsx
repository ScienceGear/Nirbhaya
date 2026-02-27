import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const coreLinks = [
    { to: "/", label: "Home" },
    { to: "/privacy", label: "Privacy and terms" },
    { to: "/faq", label: "FAQ" },
  ];

  const navLinks = coreLinks;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-lg font-bold tracking-tight">Nirbhaya</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {user.name}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="rounded-full px-5">Login</Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border bg-background/95"
          >
            <div className="container mx-auto px-4 py-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    location.pathname === l.to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={logout}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  Logout
                </button>
              ) : (
                <Link to="/login">
                  <Button size="sm" className="mt-1 w-full rounded-full">Login</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
