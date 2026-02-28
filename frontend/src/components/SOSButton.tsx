import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logSOS, reverseGeocode } from "@/lib/api";

export default function SOSButton() {
  const [expanded, setExpanded] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Get GPS on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  const triggerSOS = async (type = "SOS") => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    setAlertSent(true);

    // Log SOS to backend — notifies guardians + admins via socket
    try {
      let locName: string | undefined;
      if (gps) {
        try { locName = await reverseGeocode(gps.lat, gps.lng); } catch { locName = `${gps.lat},${gps.lng}`; }
      }
      await logSOS({ type, lat: gps?.lat, lng: gps?.lng, location: locName });
    } catch (err) {
      console.warn("[SOSButton] logSOS failed (user may not be logged in):", err);
    }

    setTimeout(() => setAlertSent(false), 3000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-16 right-0 p-4 rounded-2xl bg-card border border-border shadow-elevated w-56 space-y-2"
          >
            {alertSent ? (
              <div className="text-center py-2">
                <p className="text-safe font-semibold text-sm">✓ Alert Sent!</p>
                <p className="text-xs text-muted-foreground">Help is on the way</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Emergency</p>
                <Button size="sm" className="w-full rounded-xl justify-start" onClick={() => triggerSOS("Police SOS")}>
                  <Phone className="h-3.5 w-3.5 mr-2" /> Police (100)
                </Button>
                <Button size="sm" variant="outline" className="w-full rounded-xl justify-start" onClick={() => triggerSOS("Ambulance SOS")}>
                  <Phone className="h-3.5 w-3.5 mr-2" /> Ambulance (108)
                </Button>
                <Button size="sm" variant="outline" className="w-full rounded-xl justify-start" onClick={() => triggerSOS("Nirbhaya SOS")}>
                  <Phone className="h-3.5 w-3.5 mr-2" /> Nirbhaya (1091)
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setExpanded(!expanded)}
        className="relative h-14 w-14 rounded-full bg-danger text-danger-foreground shadow-elevated flex items-center justify-center"
      >
        <span className="absolute inset-0 rounded-full bg-danger animate-pulse-ring" />
        {expanded ? (
          <X className="h-6 w-6 relative z-10" />
        ) : (
          <span className="relative z-10 font-bold text-sm">SOS</span>
        )}
      </motion.button>
    </div>
  );
}
