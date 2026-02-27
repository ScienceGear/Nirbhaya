import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Navigation, Shield, Layers, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockRoutes, policeStations, incidents, PUNE_CENTER, type RouteOption } from "@/lib/mockData";
import SOSButton from "@/components/SOSButton";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { getMapOverview } from "@/lib/api";

// Fix for default marker icons in Leaflet with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
const createIcon = (color: string) => L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const policeIcon = createIcon("#3b82f6");
const incidentIcon = createIcon("#ef4444");
const safeIcon = createIcon("#22c55e");

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Dashboard() {
  const [origin, setOrigin] = useState("Pune Station");
  const [destination, setDestination] = useState("FC Road");
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [proximityAlert, setProximityAlert] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ["map-overview"],
    queryFn: getMapOverview,
  });

  const routeOptions = overview?.routes || mockRoutes;
  const mapIncidents = overview?.incidents || incidents;
  const stationData = overview?.policeStations || policeStations;

  const mapCenter: [number, number] = [PUNE_CENTER[1], PUNE_CENTER[0]];

  // Simulate path deviation after 10s
  useEffect(() => {
    if (selectedRoute) {
      const timer = setTimeout(() => setDeviationAlert(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [selectedRoute]);

  // Simulate proximity warning after 5s
  useEffect(() => {
    if (selectedRoute) {
      const timer = setTimeout(() => setProximityAlert(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [selectedRoute]);

  const getRSIColor = (rsi: number) => {
    if (rsi >= 80) return "text-safe";
    if (rsi >= 60) return "text-warning";
    return "text-danger";
  };

  const getRSIBg = (rsi: number) => {
    if (rsi >= 80) return "bg-safe/10 border-safe/30";
    if (rsi >= 60) return "bg-warning/10 border-warning/30";
    return "bg-danger/10 border-danger/30";
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Sidebar Panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-card border-r border-border overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-safe" />
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="pl-8 text-sm"
                placeholder="Origin"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-danger" />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pl-8 text-sm"
                placeholder="Destination"
              />
            </div>
            <Button className="w-full rounded-xl" size="sm">
              <Search className="h-4 w-4 mr-2" /> Find Safe Routes
            </Button>
          </div>

          {/* Routes */}
          <div className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Route Options
            </h3>
            {routeOptions.map((route) => (
              <motion.button
                key={route.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelectedRoute(route); setDeviationAlert(false); setProximityAlert(false); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedRoute?.id === route.id
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-primary/30 bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{route.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getRSIBg(route.rsi)}`}>
                    <span className={getRSIColor(route.rsi)}>RSI {route.rsi}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> {route.distance}
                  </span>
                  <span>⏱ {route.duration}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                    style={{ backgroundColor: route.color + "20", color: route.color }}
                  >
                    {route.type}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Map Layers */}
          <div className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Map Layers
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showHeatmap ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <Layers className="h-3 w-3 mr-1" /> Heatmap
              </Button>
              <Button
                variant={showIncidents ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowIncidents(!showIncidents)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Incidents
              </Button>
              <Button
                variant={showPolice ? "default" : "outline"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowPolice(!showPolice)}
              >
                <Shield className="h-3 w-3 mr-1" /> Police
              </Button>
            </div>
          </div>

          {/* Selected Route Details */}
          {selectedRoute && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-muted/50 border border-border space-y-3"
            >
              <h3 className="font-display font-semibold">Route Details</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-card border border-border">
                  <div className={`text-lg font-bold ${getRSIColor(selectedRoute.rsi)}`}>{selectedRoute.rsi}</div>
                  <div className="text-[10px] text-muted-foreground">RSI Score</div>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <div className="text-lg font-bold">{selectedRoute.distance}</div>
                  <div className="text-[10px] text-muted-foreground">Distance</div>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <div className="text-lg font-bold">{selectedRoute.duration}</div>
                  <div className="text-[10px] text-muted-foreground">Duration</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>🔦 3 well-lit segments • 👮 2 police stations nearby</p>
                <p>📹 CCTV coverage: 78% • 🚶 Pedestrian density: Medium</p>
              </div>
              <Button className="w-full rounded-xl" size="sm">
                <Navigation className="h-4 w-4 mr-2" /> Start Navigation
              </Button>
            </motion.div>
          )}
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-muted">
          <div className="w-full h-full min-h-[400px] relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              className="w-full h-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} />

              {/* Police Stations */}
              {showPolice && stationData.map((ps) => (
                <Marker
                  key={ps.id}
                  position={[ps.lat, ps.lng]}
                  icon={policeIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{ps.name}</strong><br />
                      {ps.address}<br />
                      {ps.phone}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Incidents */}
              {showIncidents && mapIncidents.map((inc) => (
                <Marker
                  key={inc.id}
                  position={[inc.lat, inc.lng]}
                  icon={incidentIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{inc.type.replace("_", " ")}</strong><br />
                      {inc.description}<br />
                      <span className="text-xs text-muted">
                        {new Date(inc.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Selected Route */}
              {selectedRoute && (
                <Polyline
                  positions={selectedRoute.coordinates.map((coord) => [coord[1], coord[0]])}
                  pathOptions={{ color: selectedRoute.color, weight: 5, opacity: 0.8 }}
                />
              )}

              {/* Start/End markers for selected route */}
              {selectedRoute && (
                <>
                  <Marker
                    position={[selectedRoute.coordinates[0][1], selectedRoute.coordinates[0][0]]}
                    icon={safeIcon}
                  >
                    <Popup>Start: {origin}</Popup>
                  </Marker>
                  <Marker
                    position={[
                      selectedRoute.coordinates[selectedRoute.coordinates.length - 1][1],
                      selectedRoute.coordinates[selectedRoute.coordinates.length - 1][0]
                    ]}
                    icon={createIcon("#ef4444")}
                  >
                    <Popup>Destination: {destination}</Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>

          {/* Alerts overlay */}
          {deviationAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-xl bg-warning/10 border border-warning/30 shadow-elevated backdrop-blur-md z-[1000]"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Path Deviation Detected</h4>
                  <p className="text-xs text-muted-foreground mt-1">You seem to have deviated from the safe route. Are you okay?</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 rounded-full" onClick={() => setDeviationAlert(false)}>
                      I'm Fine
                    </Button>
                    <Button size="sm" className="text-xs h-7 rounded-full bg-danger hover:bg-danger/90 text-danger-foreground">
                      Send Alert
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {proximityAlert && !deviationAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-xl bg-danger/10 border border-danger/30 shadow-elevated backdrop-blur-md z-[1000]"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">⚠️ Proximity Warning</h4>
                  <p className="text-xs text-muted-foreground mt-1">You're approaching an area with reported incidents. Stay alert.</p>
                  <Button size="sm" variant="outline" className="text-xs h-7 rounded-full mt-2" onClick={() => setProximityAlert(false)}>
                    Acknowledged
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <SOSButton />
    </div>
  );
}
