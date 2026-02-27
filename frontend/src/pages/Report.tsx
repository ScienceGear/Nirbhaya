import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Send, CheckCircle, Camera, Star, Trophy, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { incidentTypes, incidents } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReports, getUserPoints, submitReport } from "@/lib/api";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/lib/auth";

export default function ReportPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const reporterId = user?.email || "guest";
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [areaRating, setAreaRating] = useState(3);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [lastPoints, setLastPoints] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data: reportData } = useQuery({ queryKey: ["reports"], queryFn: getReports });
  const { data: pointsData } = useQuery({
    queryKey: ["user-points", reporterId],
    queryFn: () => getUserPoints(reporterId),
  });
  const reportList = reportData || incidents;

  const submitMutation = useMutation({
    mutationFn: submitReport,
    onSuccess: (response) => {
      setLastPoints(response?.pointsAwarded || 0);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["user-points", reporterId] });
    },
  });

  const captureCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Number(pos.coords.latitude.toFixed(6));
        const nextLng = Number(pos.coords.longitude.toFixed(6));
        setLat(nextLat);
        setLng(nextLng);
        if (!location.trim()) {
          setLocation(`Lat ${nextLat}, Lng ${nextLng}`);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const out = typeof reader.result === "string" ? reader.result : "";
      setImageDataUrl(out);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMutation.mutateAsync({
      type: type || "unsafe_area",
      description: desc,
      location,
      anonymous,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      areaRating,
      imageUrl: imageDataUrl || undefined,
      reporterId,
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setType("");
    setDesc("");
    setLocation("");
    setLat(null);
    setLng(null);
    setImageDataUrl("");
    setAreaRating(3);
  };

  const severityLabel = (s: number) =>
    s === 3 ? { label: "High", cls: "bg-red-500/15 text-red-400 border-red-500/30" } :
    s === 2 ? { label: "Medium", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" } :
              { label: "Low", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">

        {/* Hero header */}
        <div className="w-full px-4 md:px-8 pt-5 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-background">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-primary" />
                {t("report.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Your report helps keep other women safe. All reports can be anonymous.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shrink-0">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground leading-none">Community Points</p>
                <p className="text-xl font-bold text-amber-500 leading-tight">{pointsData?.totalPoints || 0} <span className="text-sm font-normal">pts</span></p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Two-column layout */}
        <div className="w-full px-4 md:px-8 pt-5 grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_440px] gap-6 items-start">

          {/* LEFT — Report form + share */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-5">
              <h3 className="font-display font-semibold text-base flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </span>
                Report Incident
              </h3>

              {/* Incident type + location side by side on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Incident Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Enter location or use GPS" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={captureCurrentLocation}>
                  <LocateFixed className="h-4 w-4 mr-1.5" /> Use My Current Location
                </Button>
                {lat !== null && lng !== null && (
                  <span className="text-xs text-emerald-500 font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe what happened... Your experience matters and helps others stay safe."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={5}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Rating + image side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Area Safety Rating</Label>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAreaRating(value)}
                        className={`p-1 transition-transform hover:scale-110 ${value <= areaRating ? "text-amber-500" : "text-muted-foreground/30"}`}
                        aria-label={`Rate ${value}`}
                      >
                        <Star className="h-6 w-6" fill={value <= areaRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">{areaRating}/5</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload / Capture Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors text-sm">
                    <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {imageDataUrl ? "Image selected ✓" : "Take photo or choose file"}
                    </span>
                    <Input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
                  </label>
                  {imageDataUrl && (
                    <div className="relative">
                      <img src={imageDataUrl} alt="Area preview" className="h-20 w-full object-cover rounded-xl border border-border" />
                      <button type="button" onClick={() => setImageDataUrl("")} className="absolute top-1 right-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/90 text-white hover:bg-destructive">Remove</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                <div>
                  <p className="text-sm font-medium">{t("report.anonymous")}</p>
                  <p className="text-xs text-muted-foreground">Your identity stays private</p>
                </div>
                <Switch checked={anonymous} onCheckedChange={setAnonymous} />
              </div>

              <Button type="submit" disabled={submitMutation.isPending} className="w-full rounded-xl h-11 text-sm font-semibold">
                {submitMutation.isPending ? (
                  <><span className="h-4 w-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Submit Report</>
                )}
              </Button>

              {submitted && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-sm text-emerald-500 font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Report submitted! You earned +{lastPoints} points.
                  </p>
                </motion.div>
              )}
            </form>

            {/* Share experience */}
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-primary" />
                </span>
                <h3 className="font-display font-semibold">Share Your Experience</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We understand it can be difficult to share. This space is safe, supportive, and completely anonymous. Your story can help others stay safe.
              </p>
              <Textarea placeholder="Share your experience here... (completely anonymous)" rows={3} className="rounded-xl resize-none" />
              <Button variant="outline" size="sm" className="rounded-xl">Submit Anonymously</Button>
            </div>
          </motion.div>

          {/* RIGHT — Stats + Recent reports */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Reports", value: reportList.length, color: "text-primary" },
                { label: "High Severity", value: reportList.filter(r => r.severity === 3).length, color: "text-red-400" },
                { label: "Anonymous", value: reportList.filter(r => r.anonymous).length, color: "text-emerald-400" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-card border border-border text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent reports list */}
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">Recent Community Reports</h3>
                <span className="text-xs text-muted-foreground">{reportList.length} total</span>
              </div>
              <div className="divide-y divide-border/50 max-h-[calc(100vh-280px)] overflow-y-auto">
                {reportList.map((inc, idx) => {
                  const sv = severityLabel(inc.severity);
                  return (
                    <motion.div
                      key={inc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                      className="p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sv.cls}`}>{sv.label}</span>
                          <span className="text-[11px] font-medium capitalize text-foreground/80">{inc.type.replace(/_/g, " ")}</span>
                        </div>
                        {inc.anonymous && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Anon</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{inc.description}</p>
                      {inc.locationText && (
                        <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{inc.locationText}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {typeof inc.areaRating === "number" && (
                          <span className="text-[11px] text-amber-500 flex items-center gap-0.5">
                            <Star className="h-3 w-3" fill="currentColor" /> {inc.areaRating}/5
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground/60">
                          {new Date(inc.timestamp).toLocaleDateString([], { day: "numeric", month: "short" })} · {new Date(inc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {inc.imageUrl && (
                        <img src={inc.imageUrl} alt="Reported area" className="mt-2 h-24 w-full object-cover rounded-lg border border-border" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
