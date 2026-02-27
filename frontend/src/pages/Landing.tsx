import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, MapPin, Phone, Brain, Users, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="min-h-screen bg-gradient-hero pt-20">
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm text-primary backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Trusted digital safety companion
            </div>

            <div className="mb-5 flex items-center gap-3">
              <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-12 w-12 rounded-xl object-cover shadow-soft" />
              <div>
                <p className="font-display text-2xl font-bold">Nirbhaya</p>
                <p className="text-sm text-muted-foreground">Empowering safer movement</p>
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Move with confidence, <span className="text-gradient">everyday.</span>
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
              <Link to="/faq">
                <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-base">
                  Explore FAQ
                </Button>
              </Link>
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
            className="overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-elevated"
          >
            <img
              src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80"
              alt="Nirbhaya safety interface"
              className="h-[300px] w-full rounded-2xl object-cover sm:h-[380px]"
            />
            <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
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
