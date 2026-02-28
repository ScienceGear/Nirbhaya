import { useRef, useCallback } from "react";

/**
 * Custom hook that generates an SOS alarm sound using the Web Audio API.
 * No external sound file required — synthesises a pulsing siren tone.
 *
 * Usage:
 *   const { playAlarm, stopAlarm } = useSosAlarm();
 *   // on sosAlert → playAlarm();
 *   // to silence   → stopAlarm();
 */
export function useSosAlarm(durationMs = 8000) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  const stopAlarm = useCallback(() => {
    try { nodesRef.current?.osc.stop(); } catch { /* already stopped */ }
    nodesRef.current = null;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }, []);

  const playAlarm = useCallback(() => {
    // Stop any previous alarm first
    stopAlarm();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioCtx();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    // ── Oscillator (siren sweep) ──
    const osc = ctx.createOscillator();
    osc.type = "sine";

    // Sweep between 600 Hz and 1000 Hz to produce an urgent siren feel
    const now = ctx.currentTime;
    const end = now + durationMs / 1000;
    osc.frequency.setValueAtTime(600, now);
    // Schedule rapid up/down sweeps
    for (let t = now; t < end; t += 0.6) {
      osc.frequency.linearRampToValueAtTime(1000, t + 0.3);
      osc.frequency.linearRampToValueAtTime(600, t + 0.6);
    }

    // ── Gain (pulsing envelope) ──
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    for (let t = now; t < end; t += 0.25) {
      gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.25);
    }

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(end);

    nodesRef.current = { osc, gain };

    // Auto-stop after duration
    timeoutRef.current = setTimeout(stopAlarm, durationMs + 200);
  }, [durationMs, stopAlarm]);

  return { playAlarm, stopAlarm };
}
