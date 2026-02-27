import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Phone, MapPin, Navigation, Search, Ambulance, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { policeStations, type PoliceStation } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import DashboardNav from "@/components/DashboardNav";

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
      <main className="flex-1 overflow-y-auto px-3 md:px-6 pt-4 pb-24 md:pb-10">
      <div className="container mx-auto max-w-3xl space-y-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display text-2xl font-bold mb-1">{t("nav.police")}</h1>
          <p className="text-muted-foreground text-xs">Find nearby police stations and emergency services</p>
        </motion.div>

        {/* Quick emergency dial strip */}
        <div className="grid grid-cols-3 gap-2">
          {quickDial.map((q) => (
            <a
              key={q.label}
              href={`tel:${q.number}`}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border active:scale-95 transition-all"
            >
              <div className={`h-9 w-9 rounded-full ${q.color} flex items-center justify-center`}>
                <q.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">{q.label}</span>
              <span className="text-xs font-bold text-muted-foreground">{q.number}</span>
            </a>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, area, jurisdiction…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} station{filtered.length !== 1 ? "s" : ""} found</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((ps, i) => (
            <motion.div
              key={ps.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-4 rounded-2xl bg-card border border-border shadow-soft hover:shadow-elevated transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">{ps.name}</h3>
                    {ps.distKm != null && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {ps.distKm < 1 ? `${Math.round(ps.distKm * 1000)} m` : `${ps.distKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {ps.address}
                  </p>
                  {ps.jurisdiction && (
                    <p className="text-xs text-muted-foreground mt-0.5">Jurisdiction: {ps.jurisdiction}</p>
                  )}
                  <p className="text-xs font-medium flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3 shrink-0 text-primary" /> {ps.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="rounded-xl flex-1 h-8 text-xs" asChild>
                  <a href={`tel:${ps.phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Call
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl flex-1 h-8 text-xs" asChild>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${ps.lat},${ps.lng}`} target="_blank" rel="noreferrer">
                    <Navigation className="h-3.5 w-3.5 mr-1" /> Directions
                  </a>
                </Button>
              </div>
            </motion.div>
          ))}
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
