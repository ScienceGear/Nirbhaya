import { Link } from "react-router-dom";
import { LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function GuestBanner() {
  const { isGuest, user } = useAuth();
  if (!isGuest || user) return null;

  return (
    <div className="mx-4 md:mx-8 mt-4 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <Lock className="h-4 w-4 text-amber-500 shrink-0" />
      <p className="flex-1 text-xs text-muted-foreground">
        You're exploring as a <span className="font-semibold text-amber-500">Guest</span>. Some features like SOS, Settings, and Guardian linking require an account.
      </p>
      <Link to="/login">
        <Button size="sm" className="rounded-full h-8 px-4 text-xs shrink-0">
          <LogIn className="h-3.5 w-3.5 mr-1" /> Sign in
        </Button>
      </Link>
    </div>
  );
}
