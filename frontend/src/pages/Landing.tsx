import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Brain, Users, ArrowRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* Demo incident data for the interactive map */
const MAP_INCIDENTS = [
  { id: "d1", type: "Harassment", location: "FC Road, Deccan", lat: 18.5250, lng: 73.8500, date: "15 Jan 2024, 10:30 PM", severity: "Medium" },
  { id: "d2", type: "Stalking", location: "MG Road, Camp", lat: 18.5100, lng: 73.8700, date: "14 Jan 2024, 8:15 PM", severity: "High" },
  { id: "d3", type: "Unsafe Area", location: "Karve Nagar", lat: 18.5350, lng: 73.8300, date: "13 Jan 2024, 11:00 PM", severity: "Medium" },
  { id: "d4", type: "Theft", location: "Koregaon Park", lat: 18.5200, lng: 73.8900, date: "12 Jan 2024, 9:45 PM", severity: "Medium" },
  { id: "d5", type: "Assault", location: "Swargate", lat: 18.5000, lng: 73.8400, date: "11 Jan 2024, 1:30 AM", severity: "High" },
  { id: "d6", type: "Harassment", location: "COEP Area", lat: 18.5280, lng: 73.8550, date: "10 Jan 2024, 6:00 PM", severity: "Low" },
  { id: "d7", type: "Unsafe Area", location: "Paud Road", lat: 18.5150, lng: 73.8150, date: "09 Jan 2024, 10:00 PM", severity: "Medium" },
  { id: "d8", type: "Stalking", location: "Viman Nagar", lat: 18.5400, lng: 73.8800, date: "08 Jan 2024, 7:30 PM", severity: "High" },
];

const SEVERITY_COLOR: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

/* Typewriter rotating phrases */
const HERO_PHRASES = [
  "Your safety, ",
  "Your courage, ",
  "Your confidence, ",
  "Your freedom, ",
  "Your journey, ",
];

const features = [
  {
    icon: MapPin,
    title: "Safer Route Intelligence",
    desc: "Get route suggestions based on safety score, incident density, and nearby support points.",
  },
  {
    icon: Phone,
    title: "One-Tap SOS",
    desc: "Trigger emergency mode instantly with location-aware alerts and rapid response flow.",
  },
  {
    icon: Brain,
    title: "Smart Safety Alerts",
    desc: "AI-style warnings help you avoid risky zones and stay informed in real time.",
  },
  {
    icon: Users,
    title: "Community Reporting",
    desc: "Anonymous reports help improve local awareness and support safer commuting for everyone.",
  },
];

const stats = [
  { value: "24x7", label: "Safety support" },
  { value: "1 tap", label: "Emergency trigger" },
  { value: "Live", label: "Risk insights" },
];

export default function LandingPage() {
  const { enterGuestMode } = useAuth();
  const navigate = useNavigate();

  /* ── Typewriter effect ── */
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phrase = HERO_PHRASES[phraseIdx];
    const speed = deleting ? 40 : 70;

    timeoutRef.current = setTimeout(() => {
      if (!deleting) {
        setDisplayText(phrase.slice(0, charIdx + 1));
        if (charIdx + 1 < phrase.length) {
          setCharIdx(charIdx + 1);
        } else {
          // Pause then start deleting
          setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        setDisplayText(phrase.slice(0, charIdx));
        if (charIdx > 0) {
          setCharIdx(charIdx - 1);
        } else {
          setDeleting(false);
          setPhraseIdx((phraseIdx + 1) % HERO_PHRASES.length);
        }
      }
    }, speed);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [charIdx, deleting, phraseIdx]);

  const handleGuestExplore = () => {
    enterGuestMode();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-hero pt-20">
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 flex items-center gap-3">
              <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-12 w-12 rounded-xl object-cover shadow-soft" />
              <div>
                <p className="font-display text-2xl font-bold">Nirbhaya</p>
                <p className="text-sm text-muted-foreground">Empowering safer movement</p>
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {displayText}<span className="inline-block w-[3px] h-[1em] bg-primary animate-pulse align-middle ml-0.5" />
              <br />
              <span className="text-gradient">our priority.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Nirbhaya helps women navigate safer routes, report incidents, and get emergency help faster with a modern and reliable safety-first experience.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/login">
                <Button size="lg" className="h-12 rounded-full px-8 text-base">
                  Start with Nirbhaya <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-base" onClick={handleGuestExplore}>
                <Eye className="mr-2 h-4 w-4" /> Explore as Guest
              </Button>
            </div>

            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card/70 p-3 text-center">
                  <p className="font-display text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-elevated"
          >
            <div className="h-[300px] sm:h-[380px] rounded-2xl overflow-hidden">
              <MapContainer
                center={[18.5204, 73.8567]}
                zoom={13}
                className="h-full w-full"
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {MAP_INCIDENTS.map((inc) => (
                  <CircleMarker
                    key={inc.id}
                    center={[inc.lat, inc.lng]}
                    radius={8}
                    pathOptions={{
                      color: SEVERITY_COLOR[inc.severity],
                      fillColor: SEVERITY_COLOR[inc.severity],
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs min-w-[180px] space-y-1 font-sans">
                        <p className="font-bold text-sm">{inc.type}</p>
                        <p><span className="text-muted-foreground">Location:</span> {inc.location}</p>
                        <p><span className="text-muted-foreground">Date & Time:</span> {inc.date}</p>
                        <p>
                          <span className="text-muted-foreground">Severity:</span>{" "}
                          <span style={{ color: SEVERITY_COLOR[inc.severity] }} className="font-semibold">{inc.severity}</span>
                        </p>
                        <button
                          className="mt-1 text-[11px] text-primary font-medium hover:underline"
                          onClick={() => navigate("/dashboard")}
                        >
                          View more →
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold">Live Safety Mode Active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Monitoring route confidence and nearby support points in real time.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 sm:pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card/70 py-8">
        <div className="container mx-auto flex flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-display text-lg font-bold">Nirbhaya</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy and terms</Link>
            <Link to="/faq" className="hover:text-foreground">FAQ</Link>
            <Link to="/login" className="hover:text-foreground">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
