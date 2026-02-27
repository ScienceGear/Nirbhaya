import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const QUICK_PROMPTS = [
  "How to stay safe while walking alone?",
  "What should I do if I feel followed?",
  "Emergency numbers in India",
  "Self-defense tips for women",
];

const SAFETY_KB: Record<string, string> = {
  "safe.*walk|walking.*alone|night.*safe": `**Walking Safety Tips:**
1. **Stay on well-lit, busy roads** — avoid shortcuts through isolated areas
2. **Share your live location** with a trusted contact before heading out
3. **Stay alert** — avoid headphones/phone distractions in unfamiliar areas  
4. **Use the Nirbhaya app route finder** — it picks routes near police stations and safe zones
5. **Trust your instincts** — if something feels wrong, head to the nearest crowded place
6. **Keep emergency numbers ready** — Women Helpline: 1091, Police: 100`,

  "follow|stalked|someone.*behind|feeling.*unsafe": `**If You Feel Followed:**
1. **Don't go home** — head to the nearest public place (shop, restaurant, police station)
2. **Call someone immediately** — let them know your location
3. **Use the SOS button** in this app to alert your emergency contacts
4. **Walk confidently** — avoid showing fear; cross the street to confirm suspicion
5. **If in danger**, scream for help and run toward people
6. **Remember details** — clothing, features, direction for a police report
7. **Emergency**: Dial **112** (universal) or **1091** (Women Helpline)`,

  "emergency.*number|helpline|dial|call.*help": `**Emergency Numbers (India):**
- **112** — Universal Emergency Number
- **100** — Police
- **1091** — Women Helpline
- **1098** — Child Helpline
- **108** — Ambulance
- **181** — Women Helpline (alt)
- **1096** — One Stop Centre for Women  

Save these in your phone's speed dial and in the SOS contacts of this app.`,

  "self.*defense|defend.*myself|protect.*myself": `**Self-Defense Tips:**
1. **Awareness is #1** — scan your surroundings, know exits
2. **Voice is your weapon** — yell "FIRE!" (gets more attention than "help")
3. **Target vulnerable areas** — eyes, nose, throat, groin, knees
4. **Palm strike** is more effective than a fist for beginners  
5. **Carry a safety tool** — pepper spray, personal alarm, or whistle
6. **Break free from grabs** — rotate toward the attacker's thumb (weakest point)
7. **Take a self-defense class** — Krav Maga or basic women's self-defense
8. **Trust the shake SOS** — shake your phone 3 times to send an alert via this app`,

  "cab|taxi|ride.*shar|uber|ola|auto": `**Ride Safety:**
1. **Share trip details** with a trusted contact before boarding
2. **Verify the vehicle** — check license plate, driver name, OTP
3. **Sit in the back seat** — preferably behind the driver
4. **Don't share personal details** with the driver
5. **Track the route** — make sure it matches the map
6. **Use the app's route monitor** if walking to/from the pickup point
7. **Trust your gut** — cancel if something feels off`,

  "report|harassm|assault|incident": `**How to Report:**
1. **Use the Report feature** in this app to log incidents with location & details
2. **Call Women Helpline**: **1091** or **181**
3. **File an FIR** at the nearest police station — they cannot refuse
4. **Online complaint**: NCW portal — ncw.nic.in
5. **Preserve evidence** — screenshots, photos, witness details
6. **Reach out** to NGOs: Sakhi, Majlis, Jagori for support
7. Every report helps improve the safety map for other women`,

  "hello|hi|hey|help me": `Hi! I'm your **Nirbhaya Safety Assistant** 🛡️

I can help you with:
- **Walking safety tips** and route planning
- **Emergency numbers** and helplines  
- **Self-defense** basics
- **What to do** in threatening situations
- **Reporting incidents** and getting help

Ask me anything about staying safe! You can also try the quick prompts below.`,
};

function matchKB(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [pattern, answer] of Object.entries(SAFETY_KB)) {
    if (new RegExp(pattern, "i").test(lower)) return answer;
  }
  return null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function askAI(messages: { role: string; content: string }[]): Promise<string> {
  // Try backend Groq first
  try {
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.reply || data.message || data.content || "I'm not sure how to answer that.";
    }
  } catch {
    // fallback below
  }

  // Local KB fallback
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    const kbAnswer = matchKB(lastUserMsg.content);
    if (kbAnswer) return kbAnswer;
  }

  return `I can help with safety tips, emergency numbers, and self-defense advice. Try asking about:
- How to stay safe while walking
- What to do if being followed  
- Emergency numbers in India
- Self-defense tips`;
}

export default function AISafetyAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hi! I'm your **safety assistant**. Ask me anything about staying safe, emergency contacts, self-defense, or route safety.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    const reply = await askAI(history);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        role: "assistant",
        content: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setIsTyping(false);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown: **bold**, newlines, numbered lists
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/^(\d+\.)/gm, '<span class="font-semibold">$1</span>');
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
            className="fixed bottom-24 md:bottom-6 left-3 z-[600] h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
          >
            <MessageSquare className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 md:bottom-6 left-3 z-[600] w-[calc(100vw-1.5rem)] max-w-sm bg-card border border-border rounded-2xl shadow-elevated overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-gradient-to-r from-violet-500/10 to-pink-500/10">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Safety Assistant</p>
                <p className="text-[10px] text-muted-foreground">AI-powered • Always available</p>
              </div>
              <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 200, maxHeight: "50vh" }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                    <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 items-start">
                  <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-2 flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask about safety..."
                className="flex-1 text-xs bg-transparent outline-none px-2 py-1.5"
                disabled={isTyping}
              />
              <Button
                size="icon"
                className="h-7 w-7 rounded-full shrink-0"
                disabled={!input.trim() || isTyping}
                onClick={() => send(input)}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
