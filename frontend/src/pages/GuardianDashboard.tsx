import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, MapPin, Phone, Clock, Activity,
  AlertTriangle, Navigation, BatteryMedium, Eye, Home, Settings,
  ChevronRight, RefreshCw, LinkIcon, Copy, Check, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getWatchedUsers, linkGuardian, type WatchedUser } from "@/lib/api";

export default function GuardianDashboard() {
  const { user, logout } = useAuth();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [watched, setWatched] = useState<WatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [linkMsg, setLinkMsg] = useState("");
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWatched = async () => {
    try {
      const data = await getWatchedUsers();
      setWatched(data.watched || []);
    } catch { /* backend offline — keep empty */ }
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { fetchWatched(); }, []);
  useEffect(() => {
    const iv = setInterval(fetchWatched, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleLink = async () => {
    if (!linkCode.trim()) return;
    setLinking(true);
    setLinkMsg("");
    try {
      const res = await linkGuardian(linkCode.trim());
      setLinkMsg(`Linked to ${res.linkedUser.username}!`);
      setLinkCode("");
      fetchWatched();
    } catch (err: any) {
      setLinkMsg(err.message || "Invalid code");
    }
    setLinking(false);
  };

  const copyCode = () => {
    if (user?.linkCode) {
      navigator.clipboard.writeText(user.linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeSince = (d: string | undefined) => {
    if (!d) return "N/A";
    const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const rsiColor = (v: number) => v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-red-500";
  const rsiBg = (v: number) => v >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : v >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Guardian Mode</h1>
              <p className="text-[10px] text-muted-foreground">Logged in as {user?.name || user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={fetchWatched}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">

        {/* Link a user */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Link a User</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Ask the user for their 6-character link code from Settings, then enter it here.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. D4TJW8"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="h-9 rounded-xl text-sm uppercase tracking-widest font-mono"
            />
            <Button size="sm" onClick={handleLink} disabled={linking || linkCode.length < 4} className="rounded-xl h-9 px-4">
              <LinkIcon className="h-3.5 w-3.5 mr-1" /> Link
            </Button>
          </div>
          {linkMsg && (
            <p className={`text-xs mt-2 ${linkMsg.includes("Linked") ? "text-emerald-500" : "text-destructive"}`}>{linkMsg}</p>
          )}

          {/* Show own link code */}
          {user?.linkCode && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Your code:</span>
              <span className="font-mono font-bold text-sm tracking-widest">{user.linkCode}</span>
              <button onClick={copyCode} className="ml-auto text-muted-foreground hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </motion.div>

        {/* Loading / empty */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading watched users…</p>
          </div>
        )}

        {!loading && watched.length === 0 && (
          <div className="text-center py-10">
            <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No linked users yet</p>
            <p className="text-xs text-muted-foreground mt-1">Enter a user's link code above to start watching</p>
          </div>
        )}

        {/* For each watched user */}
        {watched.map((tu) => (
          <div key={tu._id} className="space-y-3">
            {/* User card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card border border-border p-4 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-lg font-bold">
                  {tu.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-base">{tu.username}</h2>
                  <p className="text-xs text-muted-foreground">{tu.phone || tu.email}</p>
                </div>
                <div className="text-right">
                  {tu.lastLocation?.updatedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>{timeSince(tu.lastLocation.updatedAt)}</span>
                    </div>
                  )}
                  {tu.batteryLevel != null && (
                    <div className="flex items-center gap-1 text-xs mt-0.5">
                      <BatteryMedium className="h-3.5 w-3.5" />
                      <span className={tu.batteryLevel <= 20 ? "text-red-500 font-semibold" : ""}>{tu.batteryLevel}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {tu.lastLocation && (
                <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {tu.lastLocation.lat.toFixed(4)}, {tu.lastLocation.lng.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Updated {timeSince(tu.lastLocation.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`https://www.google.com/maps?q=${tu.lastLocation!.lat},${tu.lastLocation!.lng}`, "_blank")}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Map <ChevronRight className="h-3 w-3 inline" />
                  </button>
                </div>
              )}
            </motion.div>

            {/* Active navigation */}
            {tu.isNavigating && tu.currentRoute && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl bg-card border border-border p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{tu.username}'s Navigation</h3>
                  <span className="ml-auto text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">Live</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium">{tu.currentRoute.origin}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">To:</span>
                    <span className="font-medium">{tu.currentRoute.destination}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className={`p-2 rounded-lg border text-center ${rsiBg(tu.currentRoute.rsi)}`}>
                    <p className={`text-base font-bold ${rsiColor(tu.currentRoute.rsi)}`}>{tu.currentRoute.rsi}</p>
                    <p className="text-[10px] text-muted-foreground">RSI</p>
                  </div>
                  <div className="p-2 rounded-lg border border-border text-center">
                    <p className="text-sm font-bold">{tu.currentRoute.eta}</p>
                    <p className="text-[10px] text-muted-foreground">ETA</p>
                  </div>
                  <div className="p-2 rounded-lg border border-border text-center">
                    <p className="text-sm font-bold">{tu.currentRoute.distance}</p>
                    <p className="text-[10px] text-muted-foreground">Distance</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Checkpoints */}
            {tu.checkpointsPassed != null && tu.checkpointsTotal != null && tu.checkpointsTotal > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-2xl bg-card border border-border p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Checkpoint Progress</h3>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary transition-all"
                    style={{ width: `${(tu.checkpointsPassed / tu.checkpointsTotal) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  {tu.checkpointsPassed}/{tu.checkpointsTotal} checkpoints passed
                </p>
              </motion.div>
            )}

            {/* SOS Alert */}
            {tu.lastSOS && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-2xl bg-red-500/5 border border-red-500/30 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="font-semibold text-sm text-red-500">SOS Alert</h3>
                  <span className="ml-auto text-[10px] text-red-400">{timeSince(tu.lastSOS.timestamp)}</span>
                </div>
                <p className="text-xs">{tu.lastSOS.type} — {tu.lastSOS.location || `${tu.lastSOS.lat?.toFixed(4)}, ${tu.lastSOS.lng?.toFixed(4)}`}</p>
              </motion.div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {tu.phone && (
                <a href={`tel:${tu.phone.replace(/\s/g, "")}`}>
                  <Button variant="outline" className="w-full rounded-xl h-10 text-xs">
                    <Phone className="h-3.5 w-3.5 mr-1.5" /> Call {tu.username}
                  </Button>
                </a>
              )}
              <a href="tel:100">
                <Button className="w-full rounded-xl h-10 text-xs bg-red-500 hover:bg-red-600 text-white">
                  <Phone className="h-3.5 w-3.5 mr-1.5" /> Call Police
                </Button>
              </a>
            </div>
          </div>
        ))}

        {/* Last updated */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Last refreshed: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          <Link to="/guardian" className="flex flex-col items-center gap-0.5 text-primary">
            <Shield className="h-5 w-5" />
            <span className="text-[10px] font-medium">Guardian</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center gap-0.5 text-muted-foreground">
            <Settings className="h-5 w-5" />
            <span className="text-[10px]">Settings</span>
          </Link>
          <button onClick={logout} className="flex flex-col items-center gap-0.5 text-muted-foreground">
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
