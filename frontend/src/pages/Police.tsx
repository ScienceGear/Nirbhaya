import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Phone, MapPin, Navigation, Search, Ambulance, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { policeStations, type PoliceStation } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import DashboardNav from "@/components/DashboardNav";
import GuestBanner from "@/components/GuestBanner";

/* haversine — returns distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PolicePage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }
  }, []);

  /* Enrich stations with live distance & sort by proximity */
  const enriched: (PoliceStation & { distKm?: number })[] = policeStations.map((ps) => ({
    ...ps,
    distKm: userLoc ? haversineKm(userLoc.lat, userLoc.lng, ps.lat, ps.lng) : undefined,
  }));
  if (userLoc) enriched.sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));

  const filtered = enriched.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase()) ||
    (s.jurisdiction ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const quickDial = [
    { label: "Police", number: "100", icon: Shield, color: "bg-blue-600" },
    { label: "Ambulance", number: "108", icon: Ambulance, color: "bg-green-600" },
    { label: "Women Helpline", number: "1091", icon: AlertTriangle, color: "bg-rose-600" },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-8 pt-4 pb-24 md:pb-10">
      <GuestBanner />
      <div className="w-full space-y-4">

        {/* Header — compact */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">{t("nav.police")}</h1>
            <p className="text-muted-foreground text-[11px]">
              {userLoc
                ? `Showing ${filtered.length} station${filtered.length !== 1 ? "s" : ""} · sorted by distance`
                : `${filtered.length} station${filtered.length !== 1 ? "s" : ""} found · enable location for proximity sort`}
            </p>
          </div>
          {/* Quick emergency dial — inline on desktop */}
          <div className="flex gap-2">
            {quickDial.map((q) => (
              <a key={q.label} href={`tel:${q.number}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/60 hover:border-border active:scale-95 transition-all">
                <div className={`h-7 w-7 rounded-lg ${q.color} flex items-center justify-center`}>
                  <q.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="leading-none">
                  <p className="text-[11px] font-semibold">{q.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono font-bold">{q.number}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Search — full width */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, area, jurisdiction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-9 text-sm"
          />
        </div>

        {/* Station grid — responsive columns fill full width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((ps, i) => {
            const isNear = ps.distKm != null && ps.distKm < 2;
            return (
            <motion.div
              key={ps.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className={`group p-3.5 rounded-2xl border transition-all hover:shadow-md ${
                isNear
                  ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm"
                  : "bg-card border-border/60 hover:border-border shadow-sm"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isNear ? "bg-emerald-500/15" : "bg-primary/10"}`}>
                  <Shield className={`h-4.5 w-4.5 ${isNear ? "text-emerald-500" : "text-primary"} h-5 w-5`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <h3 className="font-semibold text-[13px] leading-tight truncate">{ps.name}</h3>
                    {ps.distKm != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        ps.distKm < 2 ? "bg-emerald-500/15 text-emerald-600" : ps.distKm < 5 ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"
                      }`}>
                        {ps.distKm < 1 ? `${Math.round(ps.distKm * 1000)} m` : `${ps.distKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-0.5 leading-snug">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ps.address}</span>
                  </p>
                  {ps.jurisdiction && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Jurisdiction: {ps.jurisdiction}</p>
                  )}
                  {ps.phone && (
                    <p className="text-[11px] font-medium flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 shrink-0 text-primary" /> {ps.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <Button size="sm" className={`rounded-xl flex-1 h-7 text-[11px] ${isNear ? "bg-emerald-600 hover:bg-emerald-700" : ""}`} asChild>
                  <a href={`tel:${ps.phone}`}>
                    <Phone className="h-3 w-3 mr-1" /> Call
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl flex-1 h-7 text-[11px]" asChild>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${ps.lat},${ps.lng}`} target="_blank" rel="noreferrer">
                    <Navigation className="h-3 w-3 mr-1" /> Directions
                  </a>
                </Button>
              </div>
            </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No stations match "{search}"
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
