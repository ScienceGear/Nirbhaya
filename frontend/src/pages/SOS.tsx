import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertTriangle, Ambulance, Shield, Plus, Trash2, Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultContacts, type TrustedContact } from "@/lib/mockData";
import { useI18n } from "@/lib/i18n";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getContacts, saveContacts, triggerSos } from "@/lib/api";

export default function SOSPage() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<TrustedContact[]>(defaultContacts);
  const [alertSent, setAlertSent] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [listening, setListening] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");

  const { data: apiContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts("demo"),
  });

  const saveContactsMutation = useMutation({
    mutationFn: (updatedContacts: TrustedContact[]) => saveContacts(updatedContacts, "demo"),
  });

  const sosMutation = useMutation({
    mutationFn: (type: string) => triggerSos(type, "demo"),
  });

  useEffect(() => {
    if (apiContacts && apiContacts.length) {
      setContacts(apiContacts);
    }
  }, [apiContacts]);

  const sendAlert = async (type: string) => {
    await sosMutation.mutateAsync(type);
    setAlertType(type);
    setAlertSent(true);
    // Haptic feedback simulation
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => setAlertSent(false), 4000);
  };

  const addContact = () => {
    if (!newName || !newPhone) return;
    const updated = [...contacts, { id: Date.now().toString(), name: newName, phone: newPhone, relation: newRelation }];
    setContacts(updated);
    saveContactsMutation.mutate(updated);
    setNewName(""); setNewPhone(""); setNewRelation("");
  };

  const removeContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveContactsMutation.mutate(updated);
  };

  const emergencyServices = [
    { icon: Shield, label: t("sos.police"), number: "100", color: "bg-primary" },
    { icon: Ambulance, label: t("sos.ambulance"), number: "108", color: "bg-safe" },
    { icon: AlertTriangle, label: t("sos.nirbhaya"), number: "1091", color: "bg-accent" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-2xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display text-3xl font-bold mb-2">{t("sos.title")}</h1>
          <p className="text-muted-foreground text-sm">One tap to alert emergency services and your trusted contacts</p>
        </motion.div>

        {/* Big SOS Button */}
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex justify-center">
          <button
            onClick={() => sendAlert("SOS")}
            className="relative h-40 w-40 rounded-full bg-danger text-danger-foreground font-display text-4xl font-bold shadow-elevated hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="absolute inset-0 rounded-full bg-danger animate-pulse-ring" />
            <span className="relative z-10">SOS</span>
          </button>
        </motion.div>

        <AnimatePresence>
          {alertSent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 rounded-xl bg-safe/10 border border-safe/30 text-center"
            >
              <p className="font-semibold text-safe">✓ Alert sent to {alertType}!</p>
              <p className="text-xs text-muted-foreground mt-1">GPS coordinates shared with emergency services & trusted contacts</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emergency Services */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {emergencyServices.map((s) => (
            <motion.button
              key={s.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendAlert(s.label)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border shadow-soft hover:shadow-elevated transition-all"
            >
              <div className={`h-12 w-12 rounded-full ${s.color} flex items-center justify-center`}>
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.number}</span>
            </motion.button>
          ))}
        </div>

        {/* Voice SOS */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Voice SOS</h3>
              <p className="text-xs text-muted-foreground">Say "Help me" to trigger emergency alert</p>
            </div>
            <Button
              variant={listening ? "default" : "outline"}
              size="icon"
              className="rounded-full"
              onClick={() => setListening(!listening)}
            >
              {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </div>
          {listening && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Listening for voice commands...
              </div>
            </motion.div>
          )}
        </div>

        {/* Trusted Contacts */}
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{t("settings.contacts")}</h3>
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {c.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone} • {c.relation}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendAlert(c.name)}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeContact(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add contact */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Trusted Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm" />
              <Input placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="text-sm" />
              <Input placeholder="Relation" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} className="text-sm" />
            </div>
            <Button size="sm" className="rounded-xl" onClick={addContact}>
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
