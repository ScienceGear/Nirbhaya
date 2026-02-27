import { motion } from "framer-motion";
import { Shield, Phone, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { policeStations } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { getMapOverview } from "@/lib/api";

export default function PolicePage() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ["map-overview"], queryFn: getMapOverview });
  const stations = data?.policeStations || policeStations;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display text-3xl font-bold mb-2">{t("nav.police")}</h1>
          <p className="text-muted-foreground text-sm">Find nearby police stations with contact details</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((ps, i) => (
            <motion.div
              key={ps.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-elevated transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{ps.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {ps.address}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">Jurisdiction: {ps.jurisdiction}</p>
                    <p className="text-sm font-medium flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3 shrink-0" /> {ps.phone}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xs text-muted-foreground">{ps.distance}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="rounded-xl flex-1" asChild>
                  <a href={`tel:${ps.phone}`}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Call
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl flex-1">
                  <Navigation className="h-3.5 w-3.5 mr-1" /> Directions
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
