import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Moon, Globe, Bell, Shield, User, Trophy, Camera, Users, Copy, Check, Eye, MapPin, Navigation, AlertTriangle, BatteryMedium, Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth, type SharingPrefs } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getUserPoints, updateSharingPrefs } from "@/lib/api";
import DashboardNav from "@/components/DashboardNav";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user, isGuest } = useAuth();
  const nav = useNavigate();
  const reporterId = user?.email || "guest";
  const role = user?.role || "user";

  // Block guests from Settings
  useEffect(() => {
    if (isGuest && !user) nav("/login", { replace: true });
  }, [isGuest, user, nav]);

  const [notifications, setNotifications] = useState(true);
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [voiceSOS, setVoiceSOS] = useState(false);
  const [batteryAlerts, setBatteryAlerts] = useState(true);
  const [pfp, setPfp] = useState<string>(() => localStorage.getItem("nirbhaya_pfp") || "");
  const pfpRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Sharing preferences (synced with backend) — only for regular users
  const defaultPrefs: SharingPrefs = { location: true, routeInfo: true, sosAlerts: true, batteryLevel: true, checkpoints: true, incidentReports: false };
  const [sharingPrefs, setSharingPrefs] = useState<SharingPrefs>(user?.sharingPrefs || defaultPrefs);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (user?.sharingPrefs) setSharingPrefs(user.sharingPrefs);
  }, [user?.sharingPrefs]);

  const togglePref = async (key: keyof SharingPrefs) => {
    const updated = { ...sharingPrefs, [key]: !sharingPrefs[key] };
    setSharingPrefs(updated);
    setSavingPrefs(true);
    try {
      await updateSharingPrefs(updated);
    } catch { /* offline fallback */ }
    setSavingPrefs(false);
  };

  const copyLinkCode = () => {
    if (user?.linkCode) {
      navigator.clipboard.writeText(user.linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { data: pointsData } = useQuery({
    queryKey: ["user-points", reporterId],
    queryFn: () => getUserPoints(reporterId),
    enabled: role === "user",
  });

  const handlePfpChange = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setPfp(url);
      localStorage.setItem("nirbhaya_pfp", url);
    };
    reader.readAsDataURL(file);
  };

  const totalPoints = pointsData?.totalPoints || 0;
  const tier = totalPoints >= 500 ? "Gold" : totalPoints >= 200 ? "Silver" : "Bronze";
  const tierColor = tier === "Gold" ? "text-amber-500" : tier === "Silver" ? "text-slate-400" : "text-orange-400";

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-pink-950/40 via-background to-background px-4 md:px-8 pt-6 pb-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{t("nav.settings")}</h1>
            <p className="text-xs text-muted-foreground">
              {role === "admin" ? "Platform settings & preferences" : role === "guardian" ? "Guardian preferences" : "Manage your profile, preferences & privacy"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-5 space-y-5">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-5">

        {/* Profile card — all roles */}
        {user && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                {pfp ? (
                  <img src={pfp} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <button
                onClick={() => pfpRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow"
              >
                <Camera className="h-3 w-3 text-white" />
              </button>
              <input
                ref={pfpRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handlePfpChange(e.target.files?.[0])}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{user.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-bold capitalize ${
                role === "admin" ? "bg-violet-500/10 text-violet-500" : role === "guardian" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                {role}
              </span>
            </div>
          </div>
        )}

        {/* Community points — user only */}
        {role === "user" && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Community Points</p>
                <p className="text-xs text-muted-foreground">Earn by reporting incidents & rating areas</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xl font-bold ${tierColor}`}>{totalPoints}</p>
              <p className={`text-[11px] font-semibold ${tierColor}`}>{tier} Tier</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Theme — all roles */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                <div>
                  <p className="font-medium text-sm">{t("settings.theme")}</p>
                  <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode on" : "Light mode on"}</p>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </div>
          </div>

          {/* Language — all roles */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t("settings.language")}</p>
                  <p className="text-xs text-muted-foreground">Choose your language</p>
                </div>
              </div>
              <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                <SelectTrigger className="w-28 rounded-xl text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="mr">मराठी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notifications — all roles */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-primary" />
              <p className="font-medium text-sm">Notifications & Alerts</p>
            </div>
            <div className="space-y-3 pl-7">
              {(role === "admin"
                ? [
                    { label: "Push Notifications", state: notifications, set: setNotifications },
                    { label: "New Report Alerts", state: proximityAlerts, set: setProximityAlerts },
                    { label: "SOS Alert Notifications", state: batteryAlerts, set: setBatteryAlerts },
                  ]
                : role === "guardian"
                  ? [
                      { label: "Push Notifications", state: notifications, set: setNotifications },
                      { label: "SOS Alerts", state: proximityAlerts, set: setProximityAlerts },
                      { label: "Low Battery Alerts", state: batteryAlerts, set: setBatteryAlerts },
                    ]
                  : [
                      { label: "Push Notifications", state: notifications, set: setNotifications },
                      { label: "Proximity Alerts", state: proximityAlerts, set: setProximityAlerts },
                      { label: "Voice SOS Always-on", state: voiceSOS, set: setVoiceSOS },
                      { label: "Low Battery Alert", state: batteryAlerts, set: setBatteryAlerts },
                    ]
              ).map(({ label, state, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">{label}</Label>
                  <Switch checked={state} onCheckedChange={set as any} />
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          {/* Guardian Link Code — user only */}
          {role === "user" && user && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Guardian Linking</p>
                  <p className="text-xs text-muted-foreground">Share this code with your guardian to link accounts</p>
                </div>
              </div>
              {user.linkCode && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mt-2">
                  <span className="font-mono text-lg font-bold tracking-[0.3em]">{user.linkCode}</span>
                  <button onClick={copyLinkCode} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
              {(user.myGuardians?.length ?? 0) > 0 && (
                <p className="mt-2 text-[11px] text-emerald-500 pl-1">{user.myGuardians!.length} guardian(s) linked</p>
              )}
            </div>
          )}

          {/* Data Sharing — user only */}
          {role === "user" && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-soft space-y-3">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Data Sharing with Guardians</p>
                  <p className="text-xs text-muted-foreground">Control what your guardians can see</p>
                </div>
                {savingPrefs && <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">Saving…</span>}
              </div>
              <div className="space-y-3 pl-7">
                {([
                  { key: "location" as const, label: "Live Location", icon: MapPin, desc: "Your real-time GPS position" },
                  { key: "routeInfo" as const, label: "Route Info", icon: Navigation, desc: "Current navigation route & RSI" },
                  { key: "sosAlerts" as const, label: "SOS Alerts", icon: AlertTriangle, desc: "Emergency SOS events" },
                  { key: "batteryLevel" as const, label: "Battery Level", icon: BatteryMedium, desc: "Phone battery percentage" },
                  { key: "checkpoints" as const, label: "Checkpoints", icon: Activity, desc: "Route checkpoint progress" },
                  { key: "incidentReports" as const, label: "Incident Reports", icon: FileText, desc: "Reports you have filed" },
                ]).map(({ key, label, icon: Icon, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <Label className="text-sm">{label}</Label>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch checked={sharingPrefs[key]} onCheckedChange={() => togglePref(key)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin platform info */}
          {role === "admin" && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="font-medium text-sm">Platform Administration</p>
                  <p className="text-xs text-muted-foreground">You have full admin access to the Nirbhaya platform</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-7">
                Use the Admin Dashboard to view reports, manage users, and analyze safety data with AI.
              </p>
            </div>
          )}

          {/* Guardian info */}
          {role === "guardian" && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Guardian Mode</p>
                  <p className="text-xs text-muted-foreground">You are monitoring linked users' safety</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-7">
                Use the Guardian Dashboard to link users, view their locations, and monitor SOS alerts.
              </p>
            </div>
          )}

          {/* About — all roles */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-sm">Nirbhaya v1.0</p>
                <p className="text-xs text-muted-foreground">WS002 Hackathon · Team Hustlecult 3.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      </main>
    </div>
  );
}
