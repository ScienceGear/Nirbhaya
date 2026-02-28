import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, MapPin, Phone, Clock, Activity,
  AlertTriangle, Navigation, BatteryMedium, Eye,
  ChevronRight, RefreshCw, LinkIcon, Copy, Check, UserPlus,
  Users, Bot, Send, Loader2, BarChart3, Bell, WifiOff,
  Route, CheckCircle2, Circle, ChevronDown, Smartphone,
  MapPinOff, Zap, Timer, TrendingUp, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";
import { getWatchedUsers, linkGuardian, reverseGeocode, type WatchedUser } from "@/lib/api";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { io as ioClient, type Socket } from "socket.io-client";
import { useSosAlarm } from "@/hooks/use-sos-alarm";

const GEMINI_KEY = "AIzaSyBobtdTj_dANiuRX1UNjKFFsA295cQNwes";

// Custom user marker icon
const userIcon = (online: boolean, navigating?: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${navigating ? "#f59e0b" : online ? "#10b981" : "#6b7280"};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

// Checkpoint marker for guardian map view
const cpIcon = (type: string, passed: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${
      passed ? "#10b981" : type === "police" ? "#3b82f6" : type === "hospital" ? "#f87171" : "#f59e0b"
    };border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center">
      ${passed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

export default function GuardianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [watched, setWatched] = useState<WatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linkMsg, setLinkMsg] = useState("");
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "map" | "history" | "ai">("overview");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  // Reverse-geocoded location names for watched users
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  // AI Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Redirect non-guardian
  useEffect(() => {
    if (user && user.role !== "guardian") navigate("/dashboard");
  }, [user, navigate]);

  const fetchWatched = async () => {
    try {
      setFetchError("");
      const data = await getWatchedUsers();
      setWatched(data.watched || []);
    } catch (err: any) {
      console.error("[Guardian] fetchWatched error:", err);
      setFetchError(err?.message || "Could not reach server. Is the backend running?");
    }
    setLoading(false);
    setLastRefresh(new Date());
  };

  // Use a ref so socket handlers always call the latest fetchWatched
  const fetchWatchedRef = useRef(fetchWatched);
  fetchWatchedRef.current = fetchWatched;

  // Real-time socket connection for instant SOS alerts & location updates
  const socketRef = useRef<Socket | null>(null);
  const [liveSosAlerts, setLiveSosAlerts] = useState<Array<{ userId: string; username: string; type: string; lat?: number; lng?: number; location?: string; phone?: string; timestamp: string }>>([]);
  const { playAlarm } = useSosAlarm();

  useEffect(() => {
    if (!user?._id) return;
    const socket = ioClient(import.meta.env.VITE_API_BASE_URL || "/", {
      query: { userId: user._id },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[Guardian] Socket connected", socket.id));

    socket.on("sosAlert", (data: any) => {
      console.log("[Guardian] SOS ALERT received:", data);
      setLiveSosAlerts((prev) => [{ ...data, timestamp: data.timestamp || new Date().toISOString() }, ...prev].slice(0, 50));
      // Play alarm sound notification
      playAlarm();
      // Also refresh watched users to get DB-persisted SOS data
      fetchWatchedRef.current();
    });

    socket.on("watchedUserUpdate", (data: any) => {
      console.log("[Guardian] User update:", data.username, data);
      // Trigger a refresh to pick up latest data (navigation, checkpoints, etc.)
      fetchWatchedRef.current();
    });

    return () => { socket.disconnect(); };
  }, [user?._id]);

  useEffect(() => { fetchWatched(); }, []);
  useEffect(() => {
    const iv = setInterval(fetchWatched, 15000);
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
      setLinkMsg(err.message || "Invalid code or linking failed");
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

  const isOnline = (u: WatchedUser) => {
    if (!u.lastLocation?.updatedAt) return false;
    const diff = Date.now() - new Date(u.lastLocation.updatedAt).getTime();
    return diff < 5 * 60 * 1000;
  };

  const rsiColor = (v: number) => v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-red-500";
  const rsiBg = (v: number) => v >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : v >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const cpTypeLabel = (t: string) => t === "police" ? "Police Station" : t === "hospital" ? "Hospital" : "Safe Zone";
  const cpTypeBg = (t: string) => t === "police" ? "bg-blue-500" : t === "hospital" ? "bg-red-400" : "bg-amber-400";

  // Reverse-geocode watched user locations
  useEffect(() => {
    watched.forEach((w) => {
      if (w.lastLocation && !locationNames[w._id]) {
        reverseGeocode(w.lastLocation.lat, w.lastLocation.lng).then((name) => {
          setLocationNames((prev) => ({ ...prev, [w._id]: name }));
        });
      }
    });
  }, [watched]);

  const activeSOSCount = watched.filter((w) => (w.sosAlerts?.length ?? 0) > 0).length;
  const navigatingCount = watched.filter((w) => w.isNavigating).length;
  const onlineCount = watched.filter(isOnline).length;
  const lowBatteryCount = watched.filter((w) => w.batteryLevel != null && w.batteryLevel <= 20).length;

  const selUser = selectedUser ? watched.find((w) => w._id === selectedUser) : null;

  // AI Chat
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const dataContext = `
GUARDIAN DASHBOARD DATA:
- Watched users: ${watched.length} (${onlineCount} online, ${navigatingCount} navigating, ${activeSOSCount} SOS, ${lowBatteryCount} low battery)
- Users: ${JSON.stringify(watched.map((w) => ({
  name: w.username, phone: w.phone, email: w.email, online: isOnline(w),
  lastLocation: w.lastLocation ? (locationNames[w._id] || `${w.lastLocation.lat.toFixed(4)}, ${w.lastLocation.lng.toFixed(4)}`) : "unknown",
  lastUpdate: w.lastLocation?.updatedAt || "never",
  battery: w.batteryLevel, isNavigating: w.isNavigating,
  route: w.currentRoute ? `${w.currentRoute.origin} to ${w.currentRoute.destination} (RSI: ${w.currentRoute.rsi}, ETA: ${w.currentRoute.eta}, Distance: ${w.currentRoute.distance})` : null,
  checkpoints: w.checkpoints?.length ? `${w.checkpoints.filter(c => c.passed).length}/${w.checkpoints.length} passed — ${w.checkpoints.map(c => `${c.name} (${c.type}${c.passed ? ", PASSED" : ""})`).join(", ")}` : "none",
  sosAlerts: w.sosAlerts?.length ? w.sosAlerts.map(a => `${a.type} at ${a.location || "unknown"} (${a.timestamp})`).join("; ") : "none",
  tripHistory: w.tripHistory?.length ? `${w.tripHistory.length} trips` : "none",
})))}
`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `You are an AI safety assistant for the Nirbhaya women's safety app guardian dashboard. Help guardians monitor and understand safety status of their watched users. Be concise and actionable. Mention checkpoint progress when relevant.\n${dataContext}\n\nConversation:\n${chatMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nGuardian question: ${userMsg}` }] },
            ],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
          }),
        }
      );
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate response.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Monitoring", icon: Eye },
    { id: "history", label: "Trip History", icon: History },
    { id: "map", label: "Live Map", icon: MapPin },
    { id: "ai", label: "AI Assistant", icon: Bot },
  ] as const;

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">

        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-violet-950/60 via-background to-background px-4 md:px-8 pt-6 pb-5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Guardian Dashboard</h1>
              <p className="text-xs text-muted-foreground">Watching over your loved ones · {user?.name || user?.username}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Watched Users", value: watched.length, icon: Users, color: "text-blue-500 bg-blue-500/10" },
              { label: "Online Now", value: onlineCount, icon: Eye, color: "text-emerald-500 bg-emerald-500/10" },
              { label: "Active SOS", value: activeSOSCount, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
              { label: "Navigating", value: navigatingCount, icon: Navigation, color: "text-amber-500 bg-amber-500/10" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Low battery warning */}
          {lowBatteryCount > 0 && (
            <div className="relative mt-3 p-3 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <BatteryMedium className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500">{lowBatteryCount} user{lowBatteryCount > 1 ? "s" : ""} with low battery (&le;20%)</p>
                <p className="text-[10px] text-muted-foreground">
                  {watched.filter((w) => w.batteryLevel != null && w.batteryLevel <= 20).map((w) => `${w.username} (${w.batteryLevel}%)`).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Backend error banner */}
        {fetchError && (
          <div className="mx-4 md:mx-8 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-600">{fetchError}</p>
              <p className="text-[10px] text-muted-foreground">Check your internet connection or try refreshing.</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 rounded-full text-[10px] shrink-0" onClick={fetchWatched}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Tab bar */}
        <div className="px-4 md:px-8 py-3 border-b border-border/60">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
            <div className="ml-auto">
              <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={fetchWatched}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 py-5">
          <AnimatePresence mode="wait">

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Link a user card */}
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
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
                        {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><LinkIcon className="h-3.5 w-3.5 mr-1" /> Link</>}
                      </Button>
                    </div>
                    {linkMsg && (
                      <p className={`text-xs mt-2 ${linkMsg.includes("Linked") ? "text-emerald-500" : "text-destructive"}`}>{linkMsg}</p>
                    )}
                  </div>

                  {/* User statuses */}
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-blue-500" /> User Statuses</p>
                      <button onClick={() => setActiveTab("users")} className="text-[11px] text-primary hover:underline">View all</button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {loading && (
                        <div className="text-center py-4">
                          <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Loading...</p>
                        </div>
                      )}
                      {!loading && watched.length === 0 && (
                        <div className="text-center py-6">
                          <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No linked users yet</p>
                        </div>
                      )}
                      {watched.slice(0, 5).map((tu) => (
                        <div key={tu._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {tu.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${isOnline(tu) ? "bg-emerald-500" : "bg-gray-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{tu.username}</p>
                            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              {isOnline(tu) ? (
                                <span className="text-emerald-500">Online</span>
                              ) : (
                                <><WifiOff className="h-3 w-3" /> <span>Offline</span></>
                              )}
                              {tu.lastLocation?.updatedAt && <span>· {timeSince(tu.lastLocation.updatedAt)}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {tu.isNavigating && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">Navigating</span>}
                            {tu.batteryLevel != null && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${tu.batteryLevel <= 20 ? "text-red-500" : "text-muted-foreground"}`}>
                                <BatteryMedium className="h-3 w-3" /> {tu.batteryLevel}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SOS alerts from watched users + live socket alerts */}
                {liveSosAlerts.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border-2 border-red-500/50 bg-red-500/5 p-4 animate-pulse">
                    <p className="text-sm font-bold flex items-center gap-2 mb-2 text-red-500"><Bell className="h-4 w-4" /> LIVE SOS Alerts</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {liveSosAlerts.map((a, i) => (
                        <div key={`live-sos-${i}`} className="flex items-start gap-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                          <div className="shrink-0 h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-red-500">{a.username} — {a.type}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {a.location || (a.lat ? `${a.lat.toFixed(4)}, ${a.lng?.toFixed(4)}` : "Unknown")}
                            </p>
                            {a.phone && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {a.phone}</p>}
                          </div>
                          <p className="text-[10px] text-muted-foreground shrink-0">{timeSince(a.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-sm font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-red-500" /> SOS Alerts from Users</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {watched.flatMap((w) =>
                      (w.sosAlerts || []).map((alert, i) => (
                        <div key={`${w._id}-sos-${i}`} className="flex items-start gap-3 p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                          <div className="shrink-0 h-8 w-8 rounded-full bg-red-500/15 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{w.username} — <span className="text-red-500">{alert.type}</span></p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {alert.location || `${alert.lat?.toFixed(4)}, ${alert.lng?.toFixed(4)}`}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground shrink-0">{timeSince(alert.timestamp)}</p>
                        </div>
                      ))
                    )}
                    {watched.every((w) => !w.sosAlerts?.length) && (
                      <p className="text-xs text-muted-foreground text-center py-4">No active SOS — everyone is safe</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* MONITORING TAB */}
            {activeTab === "users" && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold">Monitoring ({watched.length} users)</p>
                  <p className="text-[10px] text-muted-foreground">Auto-refreshes every 15s · Last: {timeSince(lastRefresh.toISOString())}</p>
                </div>

                {loading && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                )}

                {!loading && watched.length === 0 && (
                  <div className="text-center py-10">
                    <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No linked users yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Go to Overview to link a user</p>
                  </div>
                )}

                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {watched.map((tu) => {
                    const online = isOnline(tu);
                    const cpPassed = tu.checkpoints?.filter((c) => c.passed).length ?? tu.checkpointsPassed ?? 0;
                    const cpTotal = tu.checkpoints?.length ?? tu.checkpointsTotal ?? 0;
                    const cpPct = cpTotal > 0 ? Math.round((cpPassed / cpTotal) * 100) : 0;
                    const isExpanded = expandedUser === tu._id;

                    return (
                      <div key={tu._id} className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                        {/* User header — click to expand */}
                        <button
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedUser(isExpanded ? null : tu._id)}
                        >
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                              {tu.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card ${
                              tu.isNavigating ? "bg-amber-500" : online ? "bg-emerald-500" : "bg-gray-400"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="font-bold text-sm truncate">{tu.username}</h2>
                              {tu.isNavigating && (
                                <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-semibold animate-pulse">NAVIGATING</span>
                              )}
                              {tu.sosAlerts && tu.sosAlerts.length > 0 && (
                                <span className="text-[9px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full font-semibold animate-pulse">SOS ({tu.sosAlerts.length})</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              {online ? (
                                <span className="text-emerald-500 font-medium">Online</span>
                              ) : (
                                <><WifiOff className="h-3 w-3" /> Offline</>
                              )}
                              {tu.lastLocation?.updatedAt && <span>· {timeSince(tu.lastLocation.updatedAt)}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {tu.batteryLevel != null && (
                              <span className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                                tu.batteryLevel <= 20 ? "text-red-500 bg-red-500/10 font-bold" : "text-muted-foreground bg-muted/40"
                              }`}>
                                <BatteryMedium className="h-3 w-3" /> {tu.batteryLevel}%
                              </span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-3 border-t border-border/40">
                                {/* Location */}
                                <div className="pt-3">
                                  {tu.lastLocation ? (
                                    <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
                                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium">
                                          {locationNames[tu._id] || `${tu.lastLocation.lat.toFixed(5)}, ${tu.lastLocation.lng.toFixed(5)}`}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          Updated {timeSince(tu.lastLocation.updatedAt)}
                                          {tu.lastLocation.accuracy && ` · Accuracy: ±${Math.round(tu.lastLocation.accuracy)}m`}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => { setSelectedUser(tu._id); setActiveTab("map"); }}
                                        className="text-xs text-primary hover:underline shrink-0"
                                      >
                                        Map <ChevronRight className="h-3 w-3 inline" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-3 text-muted-foreground">
                                      <MapPinOff className="h-4 w-4" />
                                      <p className="text-xs">Location not shared or user offline</p>
                                    </div>
                                  )}
                                </div>

                                {/* Active Route + Checkpoints */}
                                {tu.isNavigating && tu.currentRoute && (
                                  <div className="rounded-xl bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/20 p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Route className="h-4 w-4 text-violet-500" />
                                      <h3 className="font-semibold text-xs">Active Route</h3>
                                      <span className="ml-auto text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                      </span>
                                    </div>

                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-muted-foreground">From:</span>
                                        <span className="font-medium truncate">{tu.currentRoute.origin}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                                        <span className="text-muted-foreground">To:</span>
                                        <span className="font-medium truncate">{tu.currentRoute.destination}</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                      <div className={`p-2 rounded-lg border text-center ${rsiBg(tu.currentRoute.rsi)}`}>
                                        <p className={`text-base font-bold ${rsiColor(tu.currentRoute.rsi)}`}>{tu.currentRoute.rsi}</p>
                                        <p className="text-[9px] text-muted-foreground">Safety</p>
                                      </div>
                                      <div className="p-2 rounded-lg border border-border text-center">
                                        <p className="text-sm font-bold">{tu.currentRoute.eta}</p>
                                        <p className="text-[9px] text-muted-foreground">ETA</p>
                                      </div>
                                      <div className="p-2 rounded-lg border border-border text-center">
                                        <p className="text-sm font-bold">{tu.currentRoute.distance}</p>
                                        <p className="text-[9px] text-muted-foreground">Distance</p>
                                      </div>
                                    </div>

                                    {/* Checkpoint progress */}
                                    {cpTotal > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Checkpoints
                                          </p>
                                          <p className="text-[10px] font-bold">
                                            <span className={cpPassed === cpTotal ? "text-emerald-500" : "text-primary"}>{cpPassed}/{cpTotal}</span>
                                            <span className="text-muted-foreground ml-1">({cpPct}%)</span>
                                          </p>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="flex gap-1">
                                          {(tu.checkpoints?.length ? tu.checkpoints : Array.from({ length: cpTotal }, (_, i) => ({ passed: i < cpPassed, name: `Checkpoint ${i + 1}`, type: "safe_zone", lat: 0, lng: 0, eta: "" }))).map((cp, i) => (
                                            <div
                                              key={i}
                                              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                                                cp.passed ? "bg-emerald-500" : "bg-muted-foreground/15"
                                              }`}
                                              title={`${cp.name}${cp.passed ? " ✓" : ""}`}
                                            />
                                          ))}
                                        </div>

                                        {/* Individual checkpoints */}
                                        {tu.checkpoints && tu.checkpoints.length > 0 && (
                                          <div className="space-y-1.5">
                                            {tu.checkpoints.map((cp, i) => (
                                              <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                                                cp.passed ? "bg-emerald-500/5" : "bg-muted/30"
                                              }`}>
                                                <div className="relative shrink-0">
                                                  {cp.passed ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                  ) : (
                                                    <Circle className={`h-4 w-4 ${cpTypeBg(cp.type).replace("bg-", "text-")}`} />
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className={`text-[11px] font-medium truncate ${cp.passed ? "text-emerald-600 line-through" : ""}`}>
                                                    {cp.name}
                                                  </p>
                                                  <p className="text-[9px] text-muted-foreground">{cpTypeLabel(cp.type)}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                  {cp.passed ? (
                                                    <span className="text-[9px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Passed ✓</span>
                                                  ) : (
                                                    <span className="text-[9px] text-muted-foreground">~{cp.eta}</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Not navigating state */}
                                {!tu.isNavigating && (
                                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-3">
                                    <Navigation className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Not currently navigating</p>
                                  </div>
                                )}

                                {/* SOS Alerts — all alerts */}
                                {tu.sosAlerts && tu.sosAlerts.length > 0 && (
                                  <div className="rounded-xl bg-red-500/5 border border-red-500/30 p-3 space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                      <h3 className="font-semibold text-xs text-red-500">SOS Alerts ({tu.sosAlerts.length})</h3>
                                    </div>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                      {tu.sosAlerts.map((alert, ai) => (
                                        <div key={ai} className="flex items-center justify-between bg-red-500/5 rounded-lg p-2">
                                          <div>
                                            <p className="text-[11px] font-medium text-red-500">{alert.type}</p>
                                            <p className="text-[9px] text-muted-foreground">{alert.location || `${alert.lat?.toFixed(4)}, ${alert.lng?.toFixed(4)}`}</p>
                                          </div>
                                          <p className="text-[9px] text-muted-foreground shrink-0">{timeSince(alert.timestamp)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Quick actions */}
                                <div className="grid grid-cols-3 gap-2">
                                  {tu.phone && (
                                    <a href={`tel:${tu.phone.replace(/\s/g, "")}`}>
                                      <Button variant="outline" className="w-full rounded-xl h-9 text-xs">
                                        <Phone className="h-3.5 w-3.5 mr-1" /> Call
                                      </Button>
                                    </a>
                                  )}
                                  <a href="tel:100">
                                    <Button className="w-full rounded-xl h-9 text-xs bg-red-500 hover:bg-red-600 text-white">
                                      <Phone className="h-3.5 w-3.5 mr-1" /> Police
                                    </Button>
                                  </a>
                                  <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => { setSelectedUser(tu._id); setActiveTab("map"); }}>
                                    <MapPin className="h-3.5 w-3.5 mr-1" /> Locate
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* LIVE MAP TAB */}
            {activeTab === "map" && (
              <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold">User Locations</p>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Online</span>
                    <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Navigating</span>
                    <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Offline</span>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border/60" style={{ height: "55vh" }}>
                  <MapContainer
                    center={
                      selUser?.lastLocation
                        ? [selUser.lastLocation.lat, selUser.lastLocation.lng]
                        : watched.find((w) => w.lastLocation)?.lastLocation
                          ? [watched.find((w) => w.lastLocation)!.lastLocation!.lat, watched.find((w) => w.lastLocation)!.lastLocation!.lng]
                          : [18.5204, 73.8567]
                    }
                    zoom={14}
                    minZoom={3}
                    maxZoom={18}
                    scrollWheelZoom
                    style={{ height: "100%", width: "100%", background: "#e8e4dc" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {watched.filter((w) => w.lastLocation).map((w) => (
                      <Marker
                        key={w._id}
                        position={[w.lastLocation!.lat, w.lastLocation!.lng]}
                        icon={userIcon(isOnline(w), !!w.isNavigating)}
                      >
                        <Popup>
                          <div className="text-xs space-y-1 min-w-[180px]">
                            <p className="font-bold text-sm">{w.username}</p>
                            <p className={isOnline(w) ? "text-green-600 font-semibold" : "text-gray-500 font-semibold"}>
                              {isOnline(w) ? "Online" : "Offline"} · {timeSince(w.lastLocation!.updatedAt)}
                            </p>
                            {w.batteryLevel != null && <p>Battery: {w.batteryLevel}%</p>}
                            {w.isNavigating && w.currentRoute && (
                              <>
                                <p className="text-green-600 font-semibold">Navigating (RSI: {w.currentRoute.rsi})</p>
                                <p>{w.currentRoute.origin} → {w.currentRoute.destination}</p>
                                {w.checkpoints && w.checkpoints.length > 0 && (
                                  <p>Checkpoints: {w.checkpoints.filter((c) => c.passed).length}/{w.checkpoints.length}</p>
                                )}
                              </>
                            )}
                            {w.sosAlerts && w.sosAlerts.length > 0 && <p className="text-red-500 font-bold">SOS: {w.sosAlerts[0].type} ({w.sosAlerts.length} total)</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {/* Show checkpoint markers for navigating users */}
                    {watched.filter((w) => w.isNavigating && w.checkpoints?.length).map((w) =>
                      w.checkpoints!.map((cp, i) => (
                        <Marker
                          key={`${w._id}-cp-${i}`}
                          position={[cp.lat, cp.lng]}
                          icon={cpIcon(cp.type, cp.passed)}
                        >
                          <Popup>
                            <div className="text-xs">
                              <p className="font-bold">{cp.name}</p>
                              <p className="text-muted-foreground">{cp.type === "police" ? "Police Station" : cp.type === "hospital" ? "Hospital" : "Safe Zone"}</p>
                              <p className={cp.passed ? "text-green-600 font-semibold" : "text-amber-500"}>
                                {cp.passed ? "✓ Passed" : `ETA: ~${cp.eta}`}
                              </p>
                              <p className="text-gray-500">({w.username}'s route)</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    )}
                  </MapContainer>
                </div>

                {/* User cards below map */}
                <div className="space-y-2 mt-4">
                  {watched.map((tu) => (
                    <div key={tu._id}
                      className={`flex items-center gap-3 p-3 rounded-2xl bg-card border cursor-pointer transition-colors ${selectedUser === tu._id ? "border-primary" : "border-border/60"}`}
                      onClick={() => setSelectedUser(tu._id)}
                    >
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold">
                          {tu.username?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                          tu.isNavigating ? "bg-amber-500" : isOnline(tu) ? "bg-emerald-500" : "bg-gray-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{tu.username}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tu.lastLocation ? (locationNames[tu._id] || `${tu.lastLocation.lat.toFixed(4)}, ${tu.lastLocation.lng.toFixed(4)}`) : "No location"}
                          {!isOnline(tu) && tu.lastLocation && " · Offline"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tu.isNavigating && tu.checkpoints && tu.checkpoints.length > 0 && (
                          <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                            CP {tu.checkpoints.filter((c) => c.passed).length}/{tu.checkpoints.length}
                          </span>
                        )}
                        {tu.sosAlerts && tu.sosAlerts.length > 0 && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                        {tu.isNavigating && <Navigation className="h-4 w-4 text-amber-500 shrink-0" />}
                      </div>
                    </div>
                  ))}
                  {watched.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No linked users</p>}
                </div>
              </motion.div>
            )}

            {/* TRIP HISTORY TAB */}
            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-5 w-5 text-violet-500" />
                  <h2 className="text-sm font-bold">Trip History</h2>
                </div>

                {watched.every((w) => !w.tripHistory?.length) && (
                  <div className="text-center py-12">
                    <Route className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No trip history yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Trips will appear here after users complete navigation</p>
                  </div>
                )}

                {watched.filter((w) => w.tripHistory?.length).map((w) => (
                  <div key={w._id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {w.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <p className="text-xs font-bold">{w.username}'s Trips</p>
                      <span className="text-[10px] text-muted-foreground">({w.tripHistory.length} trips)</span>
                    </div>

                    <div className="space-y-2">
                      {w.tripHistory.map((trip, i) => {
                        const cpPassed = trip.checkpoints?.filter((c) => c.passed).length ?? 0;
                        const cpTotal = trip.checkpoints?.length ?? 0;
                        const startDate = trip.startedAt ? new Date(trip.startedAt) : null;
                        const endDate = trip.endedAt ? new Date(trip.endedAt) : null;

                        return (
                          <div key={i} className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-muted-foreground">From:</span>
                                  <span className="font-medium truncate">{trip.origin}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                  <span className="text-muted-foreground">To:</span>
                                  <span className="font-medium truncate">{trip.destination}</span>
                                </div>
                              </div>
                              <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rsiBg(trip.rsi)}`}>
                                <span className={rsiColor(trip.rsi)}>RSI {trip.rsi}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {trip.eta}</span>
                              <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {trip.distance}</span>
                              {cpTotal > 0 && (
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {cpPassed}/{cpTotal} checkpoints</span>
                              )}
                            </div>

                            {cpTotal > 0 && (
                              <div className="flex gap-1">
                                {trip.checkpoints.map((cp, ci) => (
                                  <div
                                    key={ci}
                                    className={`h-1.5 flex-1 rounded-full ${cp.passed ? "bg-emerald-500" : "bg-muted-foreground/15"}`}
                                    title={`${cp.name}${cp.passed ? " ✓" : ""}`}
                                  />
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>
                                {startDate ? startDate.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "Unknown date"}
                                {startDate ? ` at ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </span>
                              {endDate && (
                                <span>Ended {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* AI ASSISTANT TAB */}
            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">AI Safety Assistant</p>
                    <p className="text-[10px] text-muted-foreground">Ask about your watched users' safety</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-4 min-h-[40vh] max-h-[55vh] overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Ask me about your watched users</p>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {["Are all my users safe?", "Who has low battery?", "Is anyone navigating?", "Summarize SOS alerts"].map((q) => (
                          <button key={q} onClick={() => setChatInput(q)}
                            className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-[11px] text-muted-foreground hover:bg-muted transition-colors">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted border border-border/40 rounded-bl-md"
                      }`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start mb-3">
                      <div className="px-3 py-2 rounded-2xl bg-muted border border-border/40 rounded-bl-md">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                  <Input
                    placeholder="Ask about watched users, safety, routes..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="h-10 rounded-full flex-1"
                    disabled={chatLoading}
                  />
                  <Button type="submit" size="sm" className="h-10 rounded-full px-4" disabled={chatLoading || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
