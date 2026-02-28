import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, AlertTriangle, Ambulance, Shield, Plus, Trash2, Send, Mic, MicOff, PhoneCall, PhoneOff, MapPin, Zap, Vibrate, Activity, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { defaultContacts, type TrustedContact } from "@/lib/mockData";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getContacts, saveContacts, triggerSos, logSOS, reverseGeocode } from "@/lib/api";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/lib/auth";

export default function SOSPage() {
  const { user, isGuest } = useAuth();
  const nav = useNavigate();

  // Block guests from SOS
  useEffect(() => {
    if (isGuest && !user) nav("/login", { replace: true });
  }, [isGuest, user, nav]);

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

  /* ── Send emergency SMS to all trusted contacts ── */
  const sendEmergencySMS = useCallback((reason: string) => {
    if (!contacts.length) return;
    const loc = gps
      ? `Location: https://maps.google.com/?q=${gps.lat},${gps.lng}`
      : "Location unavailable";
    const body = encodeURIComponent(
      `🚨 EMERGENCY (${reason})\nI need help immediately!\n${loc}\n— Sent via Nirbhaya Safety App`
    );
    // Open SMS app with pre-filled message for each contact
    const numbers = contacts.map((c) => c.phone.replace(/\s+/g, "")).join(",");
    window.open(`sms:${numbers}?body=${body}`, "_self");
  }, [contacts, gps]);

  const fireSos = async (type: string) => {
    await sosMutation.mutateAsync(type);
    // Also log via auth API (notifies guardians + admins via socket)
    try {
      let locName: string | undefined;
      if (gps) {
        try { locName = await reverseGeocode(gps.lat, gps.lng); } catch { locName = `${gps.lat},${gps.lng}`; }
      }
      await logSOS({ type, lat: gps?.lat, lng: gps?.lng, location: locName });
    } catch { /* ignore if not logged in */ }
    setAlertType(type);
    setAlertSent(true);
    setCountdown(null);
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    // Auto-send SMS to all trusted contacts
    sendEmergencySMS(type);
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
      // Send SMS to all trusted contacts silently
      sendEmergencySMS("Silent SOS");
      setTimeout(() => setAlertSent(false), 5000);
    }
  }, [silentSOS, gps, sosMutation]);

  // --- Voice SOS (English + Hindi + Marathi) — UNIVERSAL TRIGGER CHECK ---
  const [voiceLang, setVoiceLang] = useState<"en" | "hi" | "mr">("en");
  const [voiceLastHeard, setVoiceLastHeard] = useState<string>("");
  const [voiceActive, setVoiceActive] = useState(false); // "keep active across app"
  const VOICE_LANGS: Record<string, { label: string; code: string }> = {
    en: { label: "English", code: "en-IN" },
    hi: { label: "हिंदी", code: "hi-IN" },
    mr: { label: "मराठी", code: "mr-IN" },
  };

  // ALL trigger words checked regardless of selected language — catches romanized + native script
  const ALL_TRIGGERS = [
    // English
    "help", "help me", "save me", "emergency", "danger", "sos",
    // Hindi (romanized + Devanagari)
    "bachao", "bachaao", "bacha o", "बचाओ", "मदद", "madad", "बचाओ मुझे", "khatra", "खतरा",
    // Marathi (romanized + Devanagari)
    "वाचवा", "vachva", "vachava", "मदत", "madat", "वाचवा मला", "dhoka", "धोका",
    // Common across languages
    "police", "ambulance", "nirbhaya", "hatao", "chodo", "छोड़ो", "chhodo", "roko", "रोको",
  ];

  // Use refs so callbacks always see the current state (avoids stale closures)
  const isListeningRef = useRef(false);
  const voiceLangRef = useRef(voiceLang);
  const voiceTriggeredRef = useRef(false);

  useEffect(() => { isListeningRef.current = listening; }, [listening]);
  useEffect(() => { voiceLangRef.current = voiceLang; }, [voiceLang]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try { recognitionRef.current?.stop(); } catch {}

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.lang = VOICE_LANGS[voiceLangRef.current].code;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let alt = 0; alt < e.results[i].length; alt++) {
          const raw = e.results[i][alt].transcript || "";
          const text = raw.toLowerCase().trim();
          if (text) setVoiceLastHeard(text);
          // Check ALL triggers regardless of language
          if (!voiceTriggeredRef.current && ALL_TRIGGERS.some((t) => text.includes(t))) {
            voiceTriggeredRef.current = true;
            isListeningRef.current = false;
            setListening(false);
            try { rec.stop(); } catch {}
            sendEmergencySMS("Voice SOS");
            startCountdown("Voice SOS");
            return;
          }
        }
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        isListeningRef.current = false;
        setListening(false);
      }
      // "no-speech", "audio-capture", "network" → onend will auto-restart
    };

    rec.onend = () => {
      if (isListeningRef.current && !voiceTriggeredRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && !voiceTriggeredRef.current) {
            startRecognition();
          }
        }, 200);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      setTimeout(() => {
        if (isListeningRef.current) startRecognition();
      }, 400);
    }
  }, [sendEmergencySMS]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle listening on/off
  useEffect(() => {
    if (listening) {
      voiceTriggeredRef.current = false;
      setVoiceLastHeard("");
      startRecognition();
    } else {
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
    }
    return () => {
      try { recognitionRef.current?.stop(); } catch {};
    };
  }, [listening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-init when user changes language while listening
  useEffect(() => {
    if (listening) {
      voiceTriggeredRef.current = false;
      setVoiceLastHeard("");
      startRecognition();
    }
  }, [voiceLang]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Keep active" — persist listening across page via visibility API
  useEffect(() => {
    if (!voiceActive) return;
    const onVisChange = () => {
      if (document.visibilityState === "visible" && voiceActive && !isListeningRef.current) {
        setListening(true);
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    // Auto-start when voiceActive toggled on
    if (!listening) setListening(true);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [voiceActive]); // eslint-disable-line react-hooks/exhaustive-deps

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
    { icon: Shield,        label: "Police",    number: "100",  gradient: "from-blue-600 to-blue-500",    ring: "ring-blue-500/30"  },
    { icon: Ambulance,     label: "Ambulance", number: "108",  gradient: "from-emerald-600 to-green-500", ring: "ring-green-500/30"  },
    { icon: AlertTriangle, label: "Nirbhaya",  number: "1091", gradient: "from-rose-600 to-pink-500",    ring: "ring-rose-500/30"   },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <DashboardNav />

      {/* ── Fake Call Overlay ── */}
      <AnimatePresence>
        {fakeCall !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-gradient-to-b from-neutral-800 to-neutral-950 flex flex-col items-center justify-between py-12 px-6"
          >
            <div className="text-center">
              <p className="text-neutral-500 text-xs tracking-widest uppercase mb-6">
                {fakeCall === "ringing" ? "incoming call" : "ongoing call"}
              </p>
              <div className="relative mx-auto mb-5 w-28 h-28">
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                  {callerName[0]}
                </div>
                {fakeCall === "ringing" && <span className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-ping" />}
              </div>
              <p className="text-white text-2xl font-semibold">{callerName}</p>
              <p className="text-neutral-400 text-sm mt-1">{fakeCall === "ringing" ? "Mobile" : fmtCallTime(callTimer)}</p>
            </div>
            {fakeCall === "connected" && (
              <div className="grid grid-cols-3 gap-6 my-8">
                {[{ label: "Mute", icon: MicOff }, { label: "Speaker", icon: Zap }, { label: "Keypad", icon: Phone }].map(({ label, icon: Icon }) => (
                  <button key={label} className="flex flex-col items-center gap-1.5">
                    <div className="h-12 w-12 rounded-full bg-neutral-700/70 flex items-center justify-center"><Icon className="h-5 w-5 text-white" /></div>
                    <span className="text-neutral-400 text-[10px]">{label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-around w-full max-w-xs">
              {fakeCall === "ringing" ? (
                <>
                  <div className="flex flex-col items-center gap-1.5">
                    <button onClick={hangupFakeCall} className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"><PhoneOff className="h-7 w-7 text-white" /></button>
                    <span className="text-neutral-400 text-[10px]">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <button onClick={answerFakeCall} className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg hover:bg-green-500 transition-colors animate-pulse"><Phone className="h-7 w-7 text-white" /></button>
                    <span className="text-neutral-400 text-[10px]">Accept</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <button onClick={hangupFakeCall} className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"><PhoneOff className="h-7 w-7 text-white" /></button>
                  <span className="text-neutral-400 text-[10px]">End Call</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-6">

        {/* ── Hero section — compact, full width ── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-rose-950/80 via-background to-background px-4 md:px-8 pt-6 pb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: title + GPS */}
            <div className="flex flex-col items-center lg:items-start">
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="font-display text-2xl font-bold tracking-tight mb-1">
                Emergency SOS
              </motion.h1>
              {gps ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-500" />
                  {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  <span className="ml-1 inline-flex items-center gap-1 text-emerald-500 font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live</span>
                </motion.p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Acquiring GPS…</p>
              )}

              {/* Emergency service quick-dial row */}
              <div className="flex items-center gap-2 mt-3">
                {emergencyServices.map((s) => (
                  <a key={s.label} href={`tel:${s.number}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border/60 hover:border-border text-xs font-medium active:scale-95 transition-all">
                    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                      <s.icon className="h-3 w-3 text-white" />
                    </div>
                    <span>{s.label}</span>
                    <span className="font-mono text-muted-foreground">{s.number}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Center: SOS button */}
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="flex flex-col items-center shrink-0">
              <AnimatePresence mode="wait">
                {countdown !== null ? (
                  <motion.div key="cd" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="flex flex-col items-center gap-3">
                    <div className="relative h-32 w-32 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-rose-600/20 animate-pulse" />
                      <div className="absolute inset-2 rounded-full bg-rose-700/30 animate-pulse" style={{ animationDelay: "0.15s" }} />
                      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shadow-2xl shadow-rose-900/60 ring-4 ring-rose-400/30">
                        <span className="text-white font-display text-5xl font-bold leading-none">{countdown}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full px-6 border-rose-500/50 text-rose-400 hover:bg-rose-500/10" onClick={cancelCountdown}>Cancel</Button>
                    <p className="text-[11px] text-muted-foreground">Sending <span className="font-medium text-rose-400">{pendingType}</span>…</p>
                  </motion.div>
                ) : (
                  <motion.div key="sos" className="flex flex-col items-center gap-2">
                    <div className="relative h-32 w-32 flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-rose-500/10 animate-ping" style={{ animationDuration: "2.4s" }} />
                      <span className="absolute inset-3 rounded-full bg-rose-500/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
                      <motion.button whileTap={{ scale: 0.92 }} onClick={() => startCountdown("SOS")}
                        className="relative h-24 w-24 rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-white font-display text-3xl font-bold shadow-2xl shadow-rose-900/70 ring-1 ring-rose-400/40 hover:from-rose-400 hover:to-red-600 transition-all">
                        SOS
                      </motion.button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">3-second confirmation</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right: alert status */}
            <div className="flex flex-col items-center lg:items-end gap-2 min-w-[200px]">
              <AnimatePresence>
                {alertSent && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <p className="font-semibold text-emerald-500 text-sm">✓ {alertType} sent!</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">GPS shared with contacts</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {!alertSent && (
                <div className="text-center lg:text-right">
                  <p className="text-[11px] text-muted-foreground">Voice SOS: <span className={listening ? "text-emerald-500 font-medium" : "text-muted-foreground"}>{listening ? "Active" : "Inactive"}</span></p>
                  <p className="text-[11px] text-muted-foreground">Shake SOS: <span className={shakeEnabled ? "text-orange-500 font-medium" : "text-muted-foreground"}>{shakeEnabled ? "Active" : "Inactive"}</span></p>
                  <p className="text-[11px] text-muted-foreground">Silent SOS: <span className={silentSOS ? "text-violet-400 font-medium" : "text-muted-foreground"}>{silentSOS ? "Active" : "Inactive"}</span></p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className="w-full px-4 md:px-8 pt-5 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* LEFT — Safety Tools */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Safety Tools</p>
            <div className="grid grid-cols-2 gap-3">

              {/* Voice SOS — enhanced */}
              <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all col-span-2 ${listening ? "bg-primary/10 border-primary/40" : "bg-card border-border/60"}`}>
                {listening && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
                <div className="relative flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${listening ? "bg-primary/20" : "bg-muted"}`}>
                      {listening ? <Mic className="h-5 w-5 text-primary" /> : <MicOff className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${listening ? "text-primary" : ""}`}>Voice SOS</p>
                      <p className="text-[10px] text-muted-foreground">Say any trigger word in EN / HI / MR</p>
                    </div>
                  </div>
                  <button onClick={() => setListening((v) => !v)}
                    className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors mt-0.5 ${listening ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-0 transition-transform mt-[2px] ${listening ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>

                {/* Language selector + keep-active + last heard */}
                <div className="relative flex flex-wrap items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {(["en", "hi", "mr"] as const).map((l) => (
                      <button key={l} onClick={() => setVoiceLang(l)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${voiceLang === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {l === "en" ? "EN" : l === "hi" ? "हिं" : "मर"}
                      </button>
                    ))}
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <button onClick={() => setVoiceActive((v) => !v)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${voiceActive ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                    <Activity className="h-3 w-3" /> {voiceActive ? "Always On" : "Keep Active"}
                  </button>
                </div>

                {listening && (
                  <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[11px] text-primary font-medium">Listening…</span>
                    </div>
                    {voiceLastHeard && (
                      <p className="text-[11px] text-muted-foreground truncate">Heard: "<span className="text-foreground/80">{voiceLastHeard}</span>"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Triggers: "help" "bachao" "बचाओ" "वाचवा" "मदद" "emergency" …</p>
                  </div>
                )}
              </div>

              {/* Shake SOS */}
              <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all ${shakeEnabled ? "bg-orange-500/10 border-orange-500/40" : "bg-card border-border/60"}`}>
                {shakeEnabled && <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />}
                <div className="relative flex items-start justify-between mb-2">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${shakeEnabled ? "bg-orange-500/20" : "bg-muted"}`}>
                    <Vibrate className={`h-5 w-5 ${shakeEnabled ? "text-orange-500" : "text-muted-foreground"}`} />
                  </div>
                  <button onClick={() => setShakeEnabled((v) => !v)}
                    className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors mt-0.5 ${shakeEnabled ? "bg-orange-500" : "bg-muted-foreground/30"}`}>
                    <span className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-0 transition-transform mt-[2px] ${shakeEnabled ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>
                <p className={`text-sm font-semibold mb-0.5 ${shakeEnabled ? "text-orange-500" : ""}`}>Shake SOS</p>
                <p className="text-[11px] text-muted-foreground">Shake phone 3× to trigger</p>
                {shakeEnabled && shakeCount > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[1,2,3].map((n) => (
                      <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= shakeCount ? "bg-orange-500" : "bg-muted"}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Silent SOS */}
              <div
                className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer select-none ${silentSOS ? "bg-violet-500/10 border-violet-500/40" : "bg-card border-border/60"}`}
                onClick={handleSilentTap}
              >
                {silentSOS && <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />}
                <div className="relative flex items-start justify-between mb-2">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${silentSOS ? "bg-violet-500/20" : "bg-muted"}`}>
                    <Shield className={`h-5 w-5 ${silentSOS ? "text-violet-400" : "text-muted-foreground"}`} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSilentSOS((v) => !v); }}
                    className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors mt-0.5 ${silentSOS ? "bg-violet-500" : "bg-muted-foreground/30"}`}>
                    <span className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-0 transition-transform mt-[2px] ${silentSOS ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
                  </button>
                </div>
                <p className={`text-sm font-semibold mb-0.5 ${silentSOS ? "text-violet-400" : ""}`}>Silent SOS</p>
                <p className="text-[11px] text-muted-foreground">Tap 5× rapidly to silently alert</p>
              </div>

              {/* Fake Call — full width */}
              <div className="relative overflow-hidden p-4 rounded-2xl border bg-card border-border/60 col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Fake Call</p>
                      <p className="text-[11px] text-muted-foreground">Simulate an incoming call to escape a situation</p>
                    </div>
                  </div>
                  <button onClick={startFakeCall}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold hover:bg-emerald-500/25 transition-colors">
                    <Phone className="h-3.5 w-3.5" /> Ring Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Trusted Contacts */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Trusted Contacts</p>
            <div className="space-y-2">
              {contacts.map((c, idx) => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 hover:border-border transition-all">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none mb-0.5 truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone} · <span className="capitalize">{c.relation}</span></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`tel:${c.phone}`} className="h-8 w-8 rounded-xl bg-primary/10 hover:bg-primary/15 flex items-center justify-center transition-colors">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </a>
                    <button onClick={() => startCountdown(c.name)} className="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 flex items-center justify-center transition-colors">
                      <Send className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                    <button onClick={() => removeContact(c.id)} className="h-8 w-8 rounded-xl hover:bg-destructive/10 flex items-center justify-center transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-destructive/60 hover:text-destructive" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add contact form */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-dashed border-border space-y-3">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Plus className="h-3.5 w-3.5" /> Add New Contact
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm h-9 rounded-xl bg-background" />
                <Input placeholder="Phone number" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="text-sm h-9 rounded-xl bg-background" />
                <Input placeholder="Relation" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} className="text-sm h-9 rounded-xl bg-background" />
              </div>
              <Button size="sm" className="rounded-xl h-8 text-xs bg-primary/90 hover:bg-primary" onClick={addContact}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Contact
              </Button>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
