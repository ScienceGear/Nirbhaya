import { Link, useLocation } from "react-router-dom";
import { type ElementType } from "react";
import {
  Home,
  Map,
  Siren,
  FileWarning,
  Shield,
  Settings,
  Sun,
  Moon,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/dashboard", icon: Map, label: "Map" },
  { to: "/sos", icon: Siren, label: "SOS" },
  { to: "/report", icon: FileWarning, label: "Report" },
  { to: "/police", icon: Shield, label: "Police" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function NavButton({
  to,
  icon: Icon,
  label,
  onClick,
  active,
}: {
  to?: string;
  icon: ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const cls = `flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[9px] font-semibold leading-none tracking-wide transition-all ${
    active
      ? "bg-primary text-primary-foreground shadow-md"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

  if (to) {
    return (
      <Link to={to} aria-label={label} className={cls}>
        <Icon className="h-[17px] w-[17px] shrink-0" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      <Icon className="h-[17px] w-[17px] shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export default function DashboardNav() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <>
      <aside
        className="hidden md:flex z-[700] h-[100dvh] w-[68px] shrink-0 flex-col items-center border-r border-border bg-card py-2 gap-0.5"
        style={{ boxShadow: "2px 0 8px rgba(0,0,0,.08)" }}
      >
        <Link
          to="/"
          className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
          title="Nirbhaya"
        >
          <img
            src="/nirbhaya.png"
            alt="N"
            className="h-8 w-8 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </Link>

        <nav className="flex w-full flex-col gap-0.5 px-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavButton key={to} to={to} icon={icon} label={label} active={pathname === to} />
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex w-full flex-col gap-0.5 px-1 pb-1">
          <NavButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? "Light" : "Dark"}
            onClick={toggle}
          />
          {user ? (
            <NavButton icon={LogOut} label="Logout" onClick={logout} />
          ) : (
            <NavButton to="/login" icon={User} label="Login" active={pathname === "/login"} />
          )}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[800] border-t border-border bg-card/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),0px)]">
        <div className="grid grid-cols-6 gap-0.5 px-1 py-1">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavButton key={to} to={to} icon={icon} label={label} active={pathname === to} />
          ))}
        </div>
      </nav>
    </>
  );
}
