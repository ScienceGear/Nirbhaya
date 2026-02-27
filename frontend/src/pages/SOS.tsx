import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertTriangle, Ambulance, Shield, Plus, Trash2, Send, Mic, MicOff, PhoneCall, PhoneOff, MapPin, Zap, Vibrate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultContacts, type TrustedContact } from "@/lib/mockData";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getContacts, saveContacts, triggerSos } from "@/lib/api";
import DashboardNav from "@/components/DashboardNav";

export default function SOSPage() {
  const [contacts, setContacts] = useState<TrustedContact[]>(defaultContacts);
  const [alertSent, setAlertSent] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [listening, setListening] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingType, setPendingType] = useState<string>("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [fakeCall, setFakeCall] = useState<"idle" | "ringing" | "connected">("idle");
  const [callTimer, setCallTimer] = useState(0);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [silentSOS, setSilentSOS] = useState(false);
  const silentTapsRef = useRef<number[]>([]);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastShakeRef = useRef<number[]>([]);

  // GPS on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  const { data: apiContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts("demo"),
  });

  const saveContactsMutation = useMutation({
    mutationFn: (c: TrustedContact[]) => saveContacts(c, "demo"),
  });

  const sosMutation = useMutation({
    mutationFn: (type: string) => triggerSos(type, "demo"),
  });

  useEffect(() => {
    if (apiContacts?.length) setContacts(apiContacts);
  }, [apiContacts]);

  // --- Countdown logic ---
  const startCountdown = (type: string) => {
    setPendingType(type);
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((v) => {
        if (v === null) return null;
        if (v <= 1) {
          clearInterval(countdownRef.current!);
          fireSos(type);
          return null;
        }
        return v - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(countdownRef.current!);
    setCountdown(null);
    setPendingType("");
  };

  const fireSos = async (type: string) => {
    await sosMutation.mutateAsync(type);
    setAlertType(type);
    setAlertSent(true);
    setCountdown(null);
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    setTimeout(() => setAlertSent(false), 5000);
  };

  // --- Shake detection ---
  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.acceleration;
    if (!acc) return;
    const magnitude = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
    if (magnitude > 20) {
      const now = Date.now();
      lastShakeRef.current = [...lastShakeRef.current.filter((t) => now - t < 2000), now];
      setShakeCount(lastShakeRef.current.length);
      if (lastShakeRef.current.length >= 3) {
        lastShakeRef.current = [];
        setShakeCount(0);
        startCountdown("SOS");
      }
    }
  }, []);

  useEffect(() => {
    if (shakeEnabled) {
      window.addEventListener("devicemotion", handleMotion as any);
    } else {
      window.removeEventListener("devicemotion", handleMotion as any);
    }
    return () => window.removeEventListener("devicemotion", handleMotion as any);
  }, [shakeEnabled, handleMotion]);

  // --- Silent SOS (5 rapid taps) ---
  const handleSilentTap = useCallback(() => {
    if (!silentSOS) return;
    const now = Date.now();
    silentTapsRef.current = [...silentTapsRef.current.filter((t) => now - t < 2000), now];
    if (silentTapsRef.current.length >= 5) {
      silentTapsRef.current = [];
      // Silently trigger SOS — no countdown, no sound
      sosMutation.mutate("Silent SOS");
      setAlertType("Silent SOS");
      setAlertSent(true);
      // Try to send SMS-like notification (navigator.share if available)
      if (gps && navigator.share) {
        navigator.share({
          title: "Emergency",
          text: `Silent SOS triggered. Location: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} https://maps.google.com/?q=${gps.lat},${gps.lng}`,
        }).catch(() => {});
      }
    }
  }, [silentSOS, gps, sosMutation]);

  // --- Voice SOS (English + Hindi + Marathi) ---
  const [voiceLang, setVoiceLang] = useState<"en" | "hi" | "mr">("en");
  const VOICE_LANGS: Record<string, { label: string; code: string; triggers: string[] }> = {
    en: { label: "English", code: "en-IN", triggers: ["help", "help me", "save me", "emergency", "danger"] },
    hi: { label: "हिंदी",  code: "hi-IN", triggers: ["bachao", "बचाओ", "मदद", "madad", "help", "बचाओ मुझे"] },
    mr: { label: "मराठी",  code: "mr-IN", triggers: ["वाचवा", "मदत", "bachao", "वाचवा मला", "madat", "help"] },
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (listening) {
      const langCfg = VOICE_LANGS[voiceLang];
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.lang = langCfg.code;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.toLowerCase().trim();
          if (langCfg.triggers.some((t) => text.includes(t))) {
            startCountdown("Voice SOS");
            setListening(false);
            return;
          }
        }
      };
      rec.onerror = () => {};
      rec.onend = () => { if (listening) { try { rec.start(); } catch {} } }; // auto-restart
      rec.start();
      recognitionRef.current = rec;
    } else {
      recognitionRef.current?.stop();
    }
    return () => recognitionRef.current?.stop();
  }, [listening, voiceLang]);

  // --- Fake call with dual-tone ringtone and voice recording ---
  const startFakeCall = () => {
    setFakeCall("ringing");
    setCallTimer(0);
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    // Realistic dual-tone ring (440Hz + 480Hz like a real phone)
    const ring = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        // Ring for 1s, silent for 2s (handled by interval)
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1);
        osc2.stop(ctx.currentTime + 1);
      } catch {}
    };
    ring();
    ringIntervalRef.current = setInterval(ring, 3000);
    // Vibrate pattern like a real phone
    if (navigator.vibrate) navigator.vibrate([800, 600, 800, 600, 800, 600, 800, 600, 800]);
  };

  const answerFakeCall = () => {
    clearInterval(ringIntervalRef.current!);
    if (navigator.vibrate) navigator.vibrate(0); // stop vibration
    try { audioCtxRef.current?.close(); } catch {}
    setFakeCall("connected");
    setCallTimer(0);
    // Start call timer
    callTimerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
    // Play a voice recording using speech synthesis for natural conversation
    if ("speechSynthesis" in window) {
      const phrases = [
        "Hey! I was just calling to check on you. Are you on your way?",
        "I'm waiting near the main road. Let me know when you reach.",
        "Okay, I can see you on the map. Stay on the main road, it's safer.",
        "Don't worry, I'll stay on the line until you get here.",
      ];
      let idx = 0;
      const speak = () => {
        if (idx >= phrases.length) { idx = 0; }
        const u = new SpeechSynthesisUtterance(phrases[idx]);
        u.rate = 0.95;
        u.pitch = 1.1;
        // Pick a female voice if available
        const voices = speechSynthesis.getVoices();
        const femaleVoice = voices.find((v) => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google UK English Female") || v.name.includes("Zira"));
        if (femaleVoice) u.voice = femaleVoice;
        u.onend = () => {
          idx++;
          if (idx < phrases.length) setTimeout(speak, 2000);
        };
        speechRef.current = u;
        speechSynthesis.speak(u);
      };
      // Small delay before "person" starts talking
      setTimeout(speak, 1500);
    }
  };

  const hangupFakeCall = () => {
    clearInterval(ringIntervalRef.current!);
    clearInterval(callTimerRef.current!);
    if (navigator.vibrate) navigator.vibrate(0);
    try { audioCtxRef.current?.close(); } catch {}
    speechSynthesis?.cancel();
    setFakeCall("idle");
    setCallTimer(0);
  };

  const fmtCallTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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

  const callerName = contacts[0]?.name ?? "Unknown";

  const emergencyServices = [
    { icon: Shield, label: "Police", number: "100", color: "bg-blue-600" },
    { icon: Ambulance, label: "Ambulance", number: "108", color: "bg-green-600" },
    { icon: AlertTriangle, label: "Nirbhaya", number: "1091", color: "bg-rose-600" },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />

      {/* Fake Call Overlay — full phone call UI */}
      <AnimatePresence>
        {fakeCall !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-gradient-to-b from-neutral-800 to-neutral-950 flex flex-col items-center justify-between py-12 px-6"
          >
            {/* Top status */}
            <div className="text-center">
              <p className="text-neutral-500 text-xs tracking-wider uppercase mb-6">
                {fakeCall === "ringing" ? "incoming call" : "ongoing call"}
              </p>
              <div className="relative mx-auto mb-5">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {callerName[0]}
                </div>
                {fakeCall === "ringing" && (
                  <span className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-ping" />
                )}
              </div>
              <p className="text-white text-2xl font-semibold">{callerName}</p>
              <p className="text-neutral-400 text-sm mt-1">
                {fakeCall === "ringing" ? "Mobile" : fmtCallTime(callTimer)}
              </p>
            </div>

            {/* Middle — call actions (when connected) */}
            {fakeCall === "connected" && (
              <div className="grid grid-cols-3 gap-6 my-8">
                {[
                  { label: "Mute", icon: MicOff },
                  { label: "Speaker", icon: Zap },
                  { label: "Keypad", icon: Phone },
                ].map(({ label, icon: Icon }) => (
                  <button key={label} className="flex flex-col items-center gap-1.5">
                    <div className="h-12 w-12 rounded-full bg-neutral-700/70 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-neutral-400 text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom — answer/decline */}
            <div className="flex justify-around w-full max-w-xs">
              {fakeCall === "ringing" ? (
                <>
                  <div className="flex flex-col items-center gap-1.5">
                    <button onClick={hangupFakeCall} className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors">
                      <PhoneOff className="h-7 w-7 text-white" />
                    </button>
                    <span className="text-neutral-400 text-[10px]">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <button onClick={answerFakeCall} className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg hover:bg-green-500 transition-colors animate-pulse">
                      <Phone className="h-7 w-7 text-white" />
                    </button>
                    <span className="text-neutral-400 text-[10px]">Accept</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <button onClick={hangupFakeCall} className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors">
                    <PhoneOff className="h-7 w-7 text-white" />
                  </button>
                  <span className="text-neutral-400 text-[10px]">End Call</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto px-3 md:px-6 pt-4 pb-24 md:pb-10">
        <div className="container mx-auto max-w-2xl space-y-5">

          {/* Header + GPS */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="font-display text-2xl font-bold mb-1">Emergency SOS</h1>
            {gps ? (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3 text-green-500" />
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Acquiring GPS…</p>
            )}
          </motion.div>

          {/* Big SOS Button + countdown */}
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              {countdown !== null ? (
                <motion.div key="cd" className="flex flex-col items-center gap-3">
                  <div className="relative h-40 w-40 flex items-center justify-center rounded-full ring-4 ring-red-400/50 bg-red-700">
                    <span className="text-white font-display text-6xl font-bold">{countdown}</span>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full px-6" onClick={cancelCountdown}>
                    Cancel
                  </Button>
                  <p className="text-xs text-muted-foreground">Sending {pendingType} alert…</p>
                </motion.div>
              ) : (
                <motion.button
                  key="sos"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => startCountdown("SOS")}
                  className="relative h-40 w-40 rounded-full bg-danger text-danger-foreground font-display text-4xl font-bold shadow-elevated"
                >
                  <span className="absolute inset-0 rounded-full bg-danger/60 animate-pulse-ring" />
                  <span className="relative z-10">SOS</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Success banner */}
          <AnimatePresence>
            {alertSent && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center"
              >
                <p className="font-semibold text-green-600">✓ Alert sent — {alertType}!</p>
                <p className="text-xs text-muted-foreground mt-0.5">GPS shared with emergency services & contacts</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emergency Services */}
          <div className="grid grid-cols-3 gap-2">
            {emergencyServices.map((s) => (
              <a
                key={s.label}
                href={`tel:${s.number}`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border shadow-soft hover:shadow-elevated active:scale-95 transition-all"
              >
                <div className={`h-10 w-10 rounded-full ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-[11px] font-bold text-muted-foreground">{s.number}</span>
              </a>
            ))}
          </div>

          {/* Shake + Voice + Fake Call + Silent SOS tools */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Shake detection */}
            <div className={`p-3 rounded-xl border transition-all ${shakeEnabled ? "bg-orange-500/10 border-orange-500/40" : "bg-card border-border"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Shake SOS</span>
                </div>
                <button
                  onClick={() => setShakeEnabled((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${shakeEnabled ? "bg-orange-500" : "bg-muted-foreground/40"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${shakeEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Shake phone 3× to trigger</p>
              {shakeEnabled && shakeCount > 0 && (
                <p className="text-[11px] text-orange-500 mt-1">{shakeCount}/3 shakes</p>
              )}
            </div>

            {/* Voice SOS */}
            <div className={`p-3 rounded-xl border transition-all ${listening ? "bg-primary/10 border-primary/40" : "bg-card border-border"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {listening ? <Mic className="h-4 w-4 text-primary" /> : <MicOff className="h-4 w-4" />}
                  <span className="text-sm font-medium">Voice SOS</span>
                </div>
                <button
                  onClick={() => setListening((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${listening ? "bg-primary" : "bg-muted-foreground/40"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${listening ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-1 mb-1">
                {(["en", "hi", "mr"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setVoiceLang(l)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${voiceLang === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {l === "en" ? "EN" : l === "hi" ? "हिंदी" : "मराठी"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {voiceLang === "en" ? 'Say "Help me" / "Emergency"' : voiceLang === "hi" ? '"बचाओ" / "मदद" बोलें' : '"वाचवा" / "मदत" म्हणा'}
              </p>
              {listening && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-primary">Listening… ({VOICE_LANGS[voiceLang].code})</span>
                </motion.div>
              )}
            </div>

            {/* Fake Call */}
            <div className="p-3 rounded-xl border bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Fake Call</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Simulate an incoming call</p>
              <Button size="sm" variant="outline" className="w-full rounded-lg h-7 text-xs" onClick={startFakeCall}>
                <Phone className="h-3 w-3 mr-1" /> Ring Now
              </Button>
            </div>

            {/* Silent SOS */}
            <div
              className={`p-3 rounded-xl border transition-all cursor-pointer ${silentSOS ? "bg-neutral-500/10 border-neutral-500/40" : "bg-card border-border"}`}
              onClick={handleSilentTap}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm font-medium">Silent SOS</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSilentSOS((v) => !v); }}
                  className={`relative h-5 w-9 rounded-full transition-colors ${silentSOS ? "bg-neutral-500" : "bg-muted-foreground/40"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${silentSOS ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Tap here 5× rapidly to silently alert contacts</p>
            </div>
          </div>

          {/* Trusted Contacts */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold">Trusted Contacts</h3>
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.phone} · {c.relation}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${c.phone}`} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startCountdown(c.name)}>
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
            <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2.5">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Contact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm h-8" />
                <Input placeholder="Phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="text-sm h-8" />
                <Input placeholder="Relation" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} className="text-sm h-8" />
              </div>
              <Button size="sm" className="rounded-xl h-8 text-xs" onClick={addContact}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
