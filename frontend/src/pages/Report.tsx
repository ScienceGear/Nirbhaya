import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Send, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { incidentTypes, incidents } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReports, submitReport } from "@/lib/api";
import DashboardNav from "@/components/DashboardNav";

export default function ReportPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const { data: reportData } = useQuery({ queryKey: ["reports"], queryFn: getReports });
  const reportList = reportData || incidents;

  const submitMutation = useMutation({
    mutationFn: submitReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMutation.mutateAsync({
      type: type || "unsafe_area",
      description: desc,
      location,
      anonymous,
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setType(""); setDesc(""); setLocation("");
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-24 md:pb-10">
      <div className="container mx-auto max-w-3xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display text-3xl font-bold mb-2">{t("report.title")}</h1>
          <p className="text-muted-foreground text-sm">Your report helps keep other women safe. All reports can be anonymous.</p>
        </motion.div>

        <div className="grid gap-6">
          {/* Report Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" /> Report Incident
              </h3>

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

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe what happened... Your experience matters and helps others stay safe."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{t("report.anonymous")}</p>
                  <p className="text-xs text-muted-foreground">Your identity stays private</p>
                </div>
                <Switch checked={anonymous} onCheckedChange={setAnonymous} />
              </div>

              <Button type="submit" className="w-full rounded-xl">
                <Send className="h-4 w-4 mr-2" /> Submit Report
              </Button>

              {submitted && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-safe/10 border border-safe/30 text-center">
                  <p className="text-sm text-safe font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Report submitted successfully. Thank you for keeping others safe.
                  </p>
                </motion.div>
              )}
            </form>

            {/* Share experience */}
            <div className="mt-4 sm:mt-6 p-4 sm:p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <h3 className="font-display font-semibold">Share Your Experience</h3>
              <p className="text-sm text-muted-foreground">
                We understand it can be difficult to share. This space is safe, supportive, and completely anonymous. Your story can help others.
              </p>
              <Textarea placeholder="Share your experience here... (completely anonymous)" rows={3} className="rounded-xl" />
              <Button variant="outline" size="sm" className="rounded-xl">Submit Anonymously</Button>
            </div>
          </motion.div>

          {/* Recent Reports */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <h3 className="font-display font-semibold text-muted-foreground">Recent Community Reports</h3>
            {reportList.map((inc) => (
              <div key={inc.id} className="p-3 rounded-xl bg-card border border-border shadow-soft">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      inc.severity === 3 ? "bg-danger" : inc.severity === 2 ? "bg-warning" : "bg-safe"
                    }`} />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{inc.type.replace("_", " ")}</span>
                  </div>
                  {inc.anonymous && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Anonymous</span>
                  )}
                </div>
                <p className="text-sm mt-1">{inc.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(inc.timestamp).toLocaleDateString()} • {new Date(inc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      </main>
    </div>
  );
}
