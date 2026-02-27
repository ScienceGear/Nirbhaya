import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, FileText } from "lucide-react";

const sections = [
  {
    title: "Information We Collect",
    body: "Nirbhaya collects account details you provide, device-level location for live safety features, and voluntary incident reports. We only use this information to deliver safety alerts, route intelligence, and emergency support.",
  },
  {
    title: "How We Use Data",
    body: "Your data powers route risk scoring, SOS coordination, and in-app safety recommendations. Anonymous report data may be aggregated to improve community safety maps without exposing your identity.",
  },
  {
    title: "Emergency Sharing",
    body: "When you trigger SOS, we share your current location and emergency metadata with selected contacts or response services to support immediate assistance.",
  },
  {
    title: "Security and Retention",
    body: "We use secure access controls and retain safety data only as long as needed for operational and legal purposes. You can request deletion of account-linked data from settings or support.",
  },
  {
    title: "Your Rights",
    body: "You may request access, correction, or deletion of personal data. You can also withdraw optional permissions such as location access, though this may limit key safety features.",
  },
];

export default function PrivacyTermsPage() {
  return (
    <div className="min-h-screen bg-gradient-hero pt-24 pb-12">
      <div className="container mx-auto max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <h1 className="font-display text-3xl font-bold">Privacy and Terms</h1>
              <p className="text-sm text-muted-foreground">Nirbhaya data handling and usage policy</p>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <ShieldCheck className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Safety First</p>
              <p className="text-xs text-muted-foreground">Data usage focused on personal safety workflows.</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <Lock className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Protected Access</p>
              <p className="text-xs text-muted-foreground">Account and incident data are access controlled.</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <FileText className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Clear Terms</p>
              <p className="text-xs text-muted-foreground">Simple language with transparent feature behavior.</p>
            </div>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-border/70 p-4 sm:p-5">
                <h2 className="font-display text-xl font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>

          <p className="mt-7 text-xs text-muted-foreground">
            Last updated: February 27, 2026. For support, contact the Nirbhaya team.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/faq" className="text-sm font-medium text-primary hover:underline">
              Read FAQs
            </Link>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
