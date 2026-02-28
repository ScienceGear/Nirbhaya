import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Users, FileWarning, Bell, BarChart3,
  MapPin, Clock, AlertTriangle, Send, Bot, Loader2,
  TrendingUp, Eye, Filter, ChevronDown, ChevronUp,
  FileText, Download, ExternalLink, Phone, Mail,
  CheckCircle2, XCircle, Star, Building2, Printer,
  Siren, UserCheck, UserX, Activity, Search, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";
import { useQuery } from "@tanstack/react-query";
import { adminGetAllReports, adminGetAllUsers, adminGetAlerts } from "@/lib/api";
import { io as ioClient, type Socket } from "socket.io-client";

const GEMINI_KEY = "AIzaSyBobtdTj_dANiuRX1UNjKFFsA295cQNwes";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "alerts" | "users" | "governor" | "ai">("overview");

  // AI Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Governor submission
  const [govSubject, setGovSubject] = useState("");
  const [govBody, setGovBody] = useState("");
  const [govSent, setGovSent] = useState(false);
  const [selectedForGov, setSelectedForGov] = useState<Set<string>>(new Set());

  // Live SOS alerts via socket
  const [liveSosAlerts, setLiveSosAlerts] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Redirect non-admin
  useEffect(() => {
    if (user && user.role !== "admin") navigate("/dashboard");
  }, [user, navigate]);

  // Socket for real-time SOS
  useEffect(() => {
    if (!user?._id) return;
    const socket = ioClient(import.meta.env.VITE_API_BASE_URL || "/", {
      query: { userId: user._id },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("sosAlert", (data: any) => {
      setLiveSosAlerts((prev) => [{ ...data, timestamp: data.timestamp || new Date().toISOString() }, ...prev].slice(0, 50));
    });
    return () => { socket.disconnect(); };
  }, [user?._id]);

  const { data: reports = [], refetch: refetchReports } = useQuery({ queryKey: ["admin-reports"], queryFn: adminGetAllReports, staleTime: 60_000, retry: false });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: adminGetAllUsers, staleTime: 60_000, retry: false });
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({ queryKey: ["admin-alerts"], queryFn: adminGetAlerts, staleTime: 30_000, retry: false });

  const totalReports = reports.length;
  const highSev = reports.filter((r: any) => r.severity === "High").length;
  const medSev = reports.filter((r: any) => r.severity === "Medium").length;
  const lowSev = reports.filter((r: any) => r.severity === "Low").length;
  const totalUsers = users.length;
  const totalAlerts = alerts.length;

  const incidentTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach((r: any) => { if (r.incidentType) types.add(r.incidentType); });
    return Array.from(types).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    let filtered = reports as any[];
    if (severityFilter !== "all") filtered = filtered.filter((r) => r.severity === severityFilter);
    if (typeFilter !== "all") filtered = filtered.filter((r) => r.incidentType === typeFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter((r: any) =>
        (r.description || "").toLowerCase().includes(q) ||
        (r.locationText || "").toLowerCase().includes(q) ||
        (r.incidentType || "").toLowerCase().includes(q) ||
        (r.userID?.username || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [reports, severityFilter, typeFilter, searchQ]);

  const reportsToday = useMemo(() => {
    const today = new Date().toDateString();
    return reports.filter((r: any) => r.timestamp && new Date(r.timestamp).toDateString() === today).length;
  }, [reports]);

  const reportsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return reports.filter((r: any) => r.timestamp && new Date(r.timestamp).getTime() >= weekAgo).length;
  }, [reports]);

  const hourDist = useMemo(() => {
    const hours = new Array(24).fill(0);
    reports.forEach((r: any) => { if (r.timestamp) hours[new Date(r.timestamp).getHours()]++; });
    return hours;
  }, [reports]);
  const maxHour = Math.max(...hourDist, 1);

  const generateGovReport = () => {
    const selected = filteredReports.filter((r: any) => selectedForGov.has(r._id));
    const data = selected.length > 0 ? selected : filteredReports;
    const lines = [
      `SAFETY INCIDENT REPORT — NIRBHAYA PLATFORM`,
      `Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      `Subject: ${govSubject || "Community Safety Report"}`,
      `\nTotal Incidents: ${data.length}`,
      `High Severity: ${data.filter((r: any) => r.severity === "High").length}`,
      `Medium Severity: ${data.filter((r: any) => r.severity === "Medium").length}`,
      `Low Severity: ${data.filter((r: any) => r.severity === "Low").length}`,
      `\n${"=".repeat(60)}`,
      `\nDETAILED INCIDENT REPORTS:`,
    ];
    data.forEach((r: any, i: number) => {
      lines.push(`\n--- Incident #${i + 1} ---`);
      lines.push(`Type: ${(r.incidentType || "N/A").replace(/_/g, " ")}`);
      lines.push(`Severity: ${r.severity || "N/A"}`);
      lines.push(`Date: ${r.timestamp ? new Date(r.timestamp).toLocaleString() : "N/A"}`);
      lines.push(`Location: ${r.locationText || (r.latitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : "N/A")}`);
      lines.push(`Description: ${r.description || "No description provided"}`);
      lines.push(`Area Rating: ${r.areaRating || "N/A"}/5`);
      lines.push(`Reporter: ${r.userID?.username || "Anonymous"}`);
    });
    if (govBody) {
      lines.push(`\n${"=".repeat(60)}`);
      lines.push(`\nADDITIONAL NOTES FROM ADMIN:`);
      lines.push(govBody);
    }
    lines.push(`\n${"=".repeat(60)}`);
    lines.push(`Generated by Nirbhaya Women's Safety Platform`);
    return lines.join("\n");
  };

  const handleGovSubmit = () => {
    const report = generateGovReport();
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Nirbhaya_Safety_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setGovSent(true);
    setTimeout(() => setGovSent(false), 4000);
  };

  const handleEmailGov = () => {
    const report = generateGovReport();
    const subject = encodeURIComponent(govSubject || "Nirbhaya Safety - Community Incident Report");
    const body = encodeURIComponent(report.slice(0, 2000) + "\n\n[Full report attached separately]");
    window.open(`mailto:governor@maharashtra.gov.in?subject=${subject}&body=${body}`, "_blank");
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    try {
      const typeCounts: Record<string, number> = {};
      const severityCounts = { Low: 0, Medium: 0, High: 0 };
      const locationMap: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      reports.forEach((r: any) => {
        const t = r.incidentType || "unknown";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
        if (r.severity) (severityCounts as any)[r.severity] = ((severityCounts as any)[r.severity] || 0) + 1;
        const loc = r.locationText || "unknown";
        locationMap[loc] = (locationMap[loc] || 0) + 1;
        if (r.timestamp) hourCounts[new Date(r.timestamp).getHours()] = (hourCounts[new Date(r.timestamp).getHours()] || 0) + 1;
      });
      const roleCounts = { admin: users.filter((u: any) => u.role === "admin").length, guardian: users.filter((u: any) => u.role === "guardian").length, user: users.filter((u: any) => u.role === "user").length };
      const dataContext = `ADMIN DATA: REPORTS(${totalReports}) Sev:L=${lowSev} M=${medSev} H=${highSev} Today=${reportsToday} Week=${reportsThisWeek}\nTypes:${JSON.stringify(typeCounts)} Locations:${JSON.stringify(locationMap)} Hours:${JSON.stringify(hourCounts)}\nDetail:${JSON.stringify(reports.slice(0, 50).map((r: any) => ({ type: r.incidentType, sev: r.severity, desc: r.description?.slice(0, 100), lat: r.latitude, lng: r.longitude, date: r.timestamp, loc: r.locationText, rating: r.areaRating })))}\nUSERS(${totalUsers}) Roles:${JSON.stringify(roleCounts)}\nSOS(${totalAlerts}) Alerts:${JSON.stringify(alerts.slice(0, 20).map((a: any) => ({ type: a.type, user: a.username, loc: a.location, date: a.timestamp })))}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `You are Nirbhaya AI analyst for women's safety admin. Be detailed with statistics.\n${dataContext}\n\nChat:\n${chatMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nQ: ${userMsg}` }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.5 } }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data?.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate analysis." }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to AI." }]);
    } finally { setChatLoading(false); }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "reports", label: "Reports", icon: FileWarning },
    { id: "alerts", label: "SOS Alerts", icon: Siren },
    { id: "users", label: "Users", icon: Users },
    { id: "governor", label: "Submit Report", icon: Building2 },
    { id: "ai", label: "AI Analyst", icon: Bot },
  ] as const;

  const sevColor = (s: string) => s === "High" ? "text-red-500 bg-red-500/10 border-red-500/30" : s === "Medium" ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  const sevDot = (s: string) => s === "High" ? "bg-red-500" : s === "Medium" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-b from-violet-950/60 via-background to-background px-4 md:px-8 pt-6 pb-5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-violet-400" /></div>
            <div>
              <h1 className="font-display text-xl font-bold">Admin Command Center</h1>
              <p className="text-xs text-muted-foreground">Platform analytics, detailed reports & governance reporting</p>
            </div>
          </div>

          {liveSosAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="relative mt-4 p-3 rounded-2xl bg-red-500/10 border-2 border-red-500/40 animate-pulse">
              <p className="text-xs font-bold text-red-500 flex items-center gap-2"><Siren className="h-4 w-4" /> LIVE — {liveSosAlerts.length} SOS Alert{liveSosAlerts.length > 1 ? "s" : ""}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Latest: {liveSosAlerts[0].username} — {liveSosAlerts[0].type} at {liveSosAlerts[0].location || "Unknown"}</p>
            </motion.div>
          )}

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Total Reports", value: totalReports, sub: `${reportsToday} today`, icon: FileWarning, color: "text-blue-500 bg-blue-500/10" },
              { label: "High Severity", value: highSev, sub: `${medSev} medium`, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
              { label: "Total Users", value: totalUsers, sub: `${users.filter((u: any) => u.role === "guardian").length} guardians`, icon: Users, color: "text-emerald-500 bg-emerald-500/10" },
              { label: "SOS Alerts", value: totalAlerts, sub: `${liveSosAlerts.length} live`, icon: Bell, color: "text-amber-500 bg-amber-500/10" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground/60">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-4 md:px-8 py-3 border-b border-border/60">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-8 py-5">
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold flex items-center gap-2"><FileWarning className="h-4 w-4 text-blue-500" /> Recent Reports</p>
                      <button onClick={() => setActiveTab("reports")} className="text-[11px] text-primary hover:underline">View all →</button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {reports.slice(0, 6).map((r: any) => (
                        <div key={r._id} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                          <div className={`shrink-0 h-2.5 w-2.5 rounded-full mt-1.5 ${sevDot(r.severity)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate capitalize">{r.incidentType?.replace(/_/g, " ") || "Report"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.description || "No description"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sevColor(r.severity)}`}>{r.severity}</span>
                            <p className="text-[10px] text-muted-foreground mt-1">{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</p>
                          </div>
                        </div>
                      ))}
                      {reports.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No reports yet</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold flex items-center gap-2"><Siren className="h-4 w-4 text-red-500" /> Recent SOS</p>
                      <button onClick={() => setActiveTab("alerts")} className="text-[11px] text-primary hover:underline">View all →</button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {alerts.slice(0, 8).map((a: any, i: number) => (
                        <div key={a._id || i} className="flex items-start gap-3 p-2.5 rounded-xl bg-red-500/5 border border-red-500/15">
                          <div className="shrink-0 h-8 w-8 rounded-full bg-red-500/15 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{a.username} — <span className="text-red-500 font-semibold">{a.type}</span></p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location || `${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</p>
                        </div>
                      ))}
                      {alerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No alerts yet</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                    <p className="text-sm font-semibold flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-violet-500" /> Severity</p>
                    <div className="flex items-end gap-3 h-28">
                      {[{ label: "Low", count: lowSev, color: "bg-emerald-500" }, { label: "Medium", count: medSev, color: "bg-amber-500" }, { label: "High", count: highSev, color: "bg-red-500" }].map(({ label, count, color }) => {
                        const pct = totalReports > 0 ? (count / totalReports) * 100 : 0;
                        return (<div key={label} className="flex-1 flex flex-col items-center gap-1"><span className="text-xs font-bold">{count}</span><div className={`w-full rounded-t-lg ${color}`} style={{ height: `${Math.max(pct, 6)}%` }} /><span className="text-[10px] text-muted-foreground">{label}</span></div>);
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-card p-4 col-span-1 lg:col-span-2">
                    <p className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-blue-500" /> Incidents by Hour</p>
                    <div className="flex items-end gap-px h-20">
                      {hourDist.map((count, h) => (
                        <div key={h} className="flex-1 flex flex-col items-center gap-0.5" title={`${h}:00 — ${count}`}>
                          <div className={`w-full rounded-t ${count > 0 ? "bg-blue-500/70" : "bg-muted/30"}`} style={{ height: `${Math.max((count / maxHour) * 100, 2)}%` }} />
                          {h % 4 === 0 && <span className="text-[8px] text-muted-foreground">{h}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] text-muted-foreground mt-1"><span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-sm font-semibold flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-emerald-500" /> Platform Users</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Users", count: users.filter((u: any) => u.role === "user").length, color: "emerald", icon: UserCheck },
                      { label: "Guardians", count: users.filter((u: any) => u.role === "guardian").length, color: "blue", icon: Eye },
                      { label: "Admins", count: users.filter((u: any) => u.role === "admin").length, color: "violet", icon: ShieldCheck },
                    ].map(({ label, count, color, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <div className={`h-8 w-8 rounded-lg bg-${color}-500/15 flex items-center justify-center`}><Icon className={`h-4 w-4 text-${color}-500`} /></div>
                        <div><p className="text-lg font-bold">{count}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* DETAILED REPORTS */}
            {activeTab === "reports" && (
              <motion.div key="rp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search reports..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="h-8 pl-9 rounded-xl text-xs" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    {["all", "Low", "Medium", "High"].map((f) => (
                      <button key={f} onClick={() => setSeverityFilter(f)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${severityFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {f === "all" ? "All" : f}
                      </button>
                    ))}
                  </div>
                  {incidentTypes.length > 1 && (
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2 rounded-xl border border-border bg-background text-xs">
                      <option value="all">All Types</option>
                      {incidentTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                  )}
                  <span className="text-[11px] text-muted-foreground">{filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {filteredReports.map((r: any) => {
                    const expanded = expandedReport === r._id;
                    return (
                      <motion.div key={r._id} layout className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                        <button onClick={() => setExpandedReport(expanded ? null : r._id)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition-colors">
                          <div className={`shrink-0 h-3 w-3 rounded-full ${sevDot(r.severity)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize truncate">{r.incidentType?.replace(/_/g, " ") || "Report"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{r.description || "No description"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sevColor(r.severity)}`}>{r.severity}</span>
                            {r.areaRating && <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><Star className="h-3 w-3" fill="currentColor" /> {r.areaRating}/5</span>}
                            <span className="text-[10px] text-muted-foreground">{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</span>
                            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div><p className="text-muted-foreground text-[10px]">Incident Type</p><p className="font-medium capitalize">{r.incidentType?.replace(/_/g, " ") || "N/A"}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Severity</p><p className={`font-semibold ${r.severity === "High" ? "text-red-500" : r.severity === "Medium" ? "text-amber-500" : "text-emerald-500"}`}>{r.severity}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Date & Time</p><p className="font-medium">{r.timestamp ? new Date(r.timestamp).toLocaleString() : "N/A"}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Area Rating</p><p className="font-medium flex items-center gap-1">{r.areaRating || "N/A"}/5 <Star className="h-3 w-3 text-amber-500" fill="currentColor" /></p></div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-[10px]">Location</p>
                                  <p className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /> {r.locationText || (r.latitude ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}` : "N/A")}</p>
                                  {r.latitude && r.longitude && (
                                    <a href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"><ExternalLink className="h-3 w-3" /> Open in Maps</a>
                                  )}
                                </div>
                                <div><p className="text-muted-foreground text-[10px]">Full Description</p><p className="text-xs leading-relaxed">{r.description || "No description"}</p></div>
                                {r.imageUrl && <div><p className="text-muted-foreground text-[10px] mb-1">Evidence</p><img src={r.imageUrl} alt="Evidence" className="h-32 w-full object-cover rounded-lg border border-border" /></div>}
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><UserCheck className="h-3 w-3" /> {r.userID?.username || r.reporterKey || "Anonymous"}</span>
                                  {r.anonymous && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Anonymous</span>}
                                  {r.pointsAwarded > 0 && <span className="text-[10px] text-amber-500">+{r.pointsAwarded} pts</span>}
                                </div>
                                <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px]"
                                  onClick={() => { setSelectedForGov((prev) => { const n = new Set(prev); if (n.has(r._id)) n.delete(r._id); else n.add(r._id); return n; }); }}>
                                  {selectedForGov.has(r._id) ? <><CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Selected</> : <><FileText className="h-3 w-3 mr-1" /> Select for Report</>}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                  {filteredReports.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No reports match filters</p>}
                </div>
              </motion.div>
            )}

            {/* SOS ALERTS */}
            {activeTab === "alerts" && (
              <motion.div key="al" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">All SOS Alerts ({totalAlerts + liveSosAlerts.length})</p>
                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px]" onClick={() => refetchAlerts()}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
                </div>
                {liveSosAlerts.length > 0 && (
                  <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/5 p-4 space-y-2">
                    <p className="text-xs font-bold text-red-500 flex items-center gap-2"><Siren className="h-4 w-4 animate-pulse" /> LIVE</p>
                    {liveSosAlerts.map((a, i) => (
                      <div key={`live-${i}`} className="flex items-start gap-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="shrink-0 h-9 w-9 rounded-full bg-red-500/20 flex items-center justify-center"><Siren className="h-4 w-4 text-red-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-500">{a.username} — {a.type}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location || "Unknown"}</p>
                          {a.phone && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {a.phone}</p>}
                        </div>
                        <div className="text-right shrink-0"><p className="text-[10px] text-red-400 font-medium">LIVE</p><p className="text-[10px] text-muted-foreground">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {alerts.map((a: any, i: number) => {
                    const expanded = expandedAlert === (a._id || `alert-${i}`);
                    return (
                      <div key={a._id || i} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                        <button onClick={() => setExpandedAlert(expanded ? null : (a._id || `alert-${i}`))} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition-colors">
                          <div className="shrink-0 h-8 w-8 rounded-full bg-red-500/15 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{a.username} — <span className="text-red-500">{a.type}</span></p>
                            <p className="text-[10px] text-muted-foreground truncate">{a.location || `${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</span>
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <AnimatePresence>
                          {expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-2 border-t border-border/40 pt-3 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                  <div><p className="text-muted-foreground text-[10px]">User</p><p className="font-medium">{a.username}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Email</p><p className="font-medium">{a.email || "N/A"}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Phone</p><p className="font-medium">{a.phone || "N/A"}</p></div>
                                  <div><p className="text-muted-foreground text-[10px]">Type</p><p className="font-semibold text-red-500">{a.type}</p></div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-[10px]">Location</p>
                                  <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location || "N/A"}</p>
                                  {a.lat && a.lng && <a href={`https://maps.google.com/?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"><ExternalLink className="h-3 w-3" /> Map</a>}
                                </div>
                                <div className="flex gap-2">
                                  {a.phone && <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px]" onClick={() => window.open(`tel:${a.phone}`)}><Phone className="h-3 w-3 mr-1" /> Call</Button>}
                                  <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px]" onClick={() => { setActiveTab("governor"); }}><Building2 className="h-3 w-3 mr-1" /> Escalate</Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {alerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No SOS alerts</p>}
                </div>
              </motion.div>
            )}

            {/* USERS */}
            {activeTab === "users" && (
              <motion.div key="us" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="text-sm font-semibold mb-4">All Users ({totalUsers})</p>
                <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                  {users.map((u: any) => (
                    <div key={u._id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {u.profilePic ? <img src={u.profilePic} className="h-10 w-10 rounded-xl object-cover" alt="" /> : u.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{u.username}</p><p className="text-[11px] text-muted-foreground truncate">{u.email}</p></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${u.role === "admin" ? "bg-violet-500/10 text-violet-500" : u.role === "guardian" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"}`}>{u.role}</span>
                        {u.isMinor && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">Minor</span>}
                        <span className="text-[10px] text-muted-foreground">{u.points || 0} pts</span>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No users</p>}
                </div>
              </motion.div>
            )}

            {/* GOVERNOR SUBMIT */}
            {activeTab === "governor" && (
              <motion.div key="gov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5 max-w-3xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center"><Building2 className="h-5 w-5 text-violet-500" /></div>
                  <div><h2 className="text-base font-bold">Submit Safety Report to Authorities</h2><p className="text-xs text-muted-foreground">Generate a formal report for Governor / Commissioner / Police</p></div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
                  <div className="space-y-2"><label className="text-xs font-medium">Report Subject</label><Input value={govSubject} onChange={(e) => setGovSubject(e.target.value)} placeholder="e.g., Monthly Safety Incident Report — Pune District" className="rounded-xl text-sm" /></div>
                  <div className="space-y-2"><label className="text-xs font-medium">Additional Notes</label><Textarea value={govBody} onChange={(e) => setGovBody(e.target.value)} placeholder="Context, recommendations, specific concerns..." rows={4} className="rounded-xl resize-none text-sm" /></div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                    <p className="text-xs font-semibold">Report includes:</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {selectedForGov.size > 0 ? `${selectedForGov.size} selected` : `All ${filteredReports.length} reports`}</div>
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Severity breakdown</div>
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Location details</div>
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Full descriptions</div>
                    </div>
                    {selectedForGov.size > 0 && <button onClick={() => setSelectedForGov(new Set())} className="text-[10px] text-primary hover:underline">Clear selection</button>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleGovSubmit} className="rounded-xl flex-1"><Download className="h-4 w-4 mr-2" /> Download (.txt)</Button>
                    <Button variant="outline" onClick={handleEmailGov} className="rounded-xl flex-1"><Mail className="h-4 w-4 mr-2" /> Email Governor</Button>
                    <Button variant="outline" onClick={() => window.print()} className="rounded-xl"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  </div>
                  {govSent && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center"><p className="text-sm text-emerald-500 font-medium flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Report downloaded!</p></motion.div>}
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4 text-blue-500" /> Authority Contacts</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { name: "Women Helpline", phone: "181", desc: "National Commission for Women" },
                      { name: "Police Emergency", phone: "112", desc: "Unified Emergency" },
                      { name: "Domestic Abuse", phone: "1091", desc: "Women in Distress" },
                      { name: "Cyber Crime", phone: "1930", desc: "National Cyber Crime" },
                      { name: "Child Helpline", phone: "1098", desc: "CHILDLINE India" },
                      { name: "Anti-Stalking", phone: "1096", desc: "Nirbhaya Squad" },
                    ].map((c) => (
                      <a key={c.phone} href={`tel:${c.phone}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Phone className="h-4 w-4 text-blue-500" /></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.desc}</p></div>
                        <span className="text-sm font-bold text-blue-500">{c.phone}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI ANALYST */}
            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Bot className="h-4 w-4 text-white" /></div>
                  <div><p className="text-sm font-semibold">Nirbhaya AI — Data Analyst</p><p className="text-[10px] text-muted-foreground">Analyze reports, patterns, hotspots & trends</p></div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-4 min-h-[40vh] max-h-[55vh] overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Ask me to analyze safety data</p>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {["Top crime hotspots", "Peak incident hours", "Severity trends", "Common incident types", "Full safety report", "Draft governor summary"].map((q) => (
                          <button key={q} onClick={() => setChatInput(q)} className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-[11px] text-muted-foreground hover:bg-muted">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted border border-border/40 rounded-bl-md"}`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="flex justify-start mb-3"><div className="px-3 py-2 rounded-2xl bg-muted border border-border/40 rounded-bl-md"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div></div>}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                  <Input placeholder="Ask about patterns, hotspots, trends..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="h-10 rounded-full flex-1" disabled={chatLoading} />
                  <Button type="submit" size="sm" className="h-10 rounded-full px-4" disabled={chatLoading || !chatInput.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
