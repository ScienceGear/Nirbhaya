import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth, type UserRole } from "@/lib/auth";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [role, setRole] = useState<UserRole>("user");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const err = isSignup
        ? await signup(name.trim(), email.trim(), password, role)
        : await login(email.trim(), password, role);

      if (err) {
        setError(err);
      } else {
        navigate(role === "guardian" ? "/guardian" : "/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError("");
    setSubmitting(true);
    const err = await login("priya@nirbhaya.app", "demo123", role);
    if (err) { setError(err); setSubmitting(false); return; }
    setSubmitting(false);
    navigate(role === "guardian" ? "/guardian" : "/dashboard");
  };

  return (
    <div className="bg-gradient-hero pt-20">
      <div className="container mx-auto flex min-h-[calc(100vh-5rem)] items-center px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-elevated lg:grid-cols-2"
        >
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <img src="/nirbhaya.png" alt="Nirbhaya logo" className="h-10 w-10 rounded-xl object-cover" />
              <div>
                <p className="font-display text-xl font-bold">Nirbhaya</p>
                <p className="text-xs text-muted-foreground">Your safety assistant</p>
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {isSignup ? "Set up your Nirbhaya profile" : "Sign in and continue safer journeys"}
            </p>

            <div className="mt-5">
              <Button type="button" variant="outline" className="h-10 w-full rounded-full" onClick={handleGoogleContinue} disabled={submitting}>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">D</span>
                Quick Demo Login
              </Button>

              <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Role selector */}
              <div className="space-y-1.5">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("user")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      role === "user"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Shield className="h-4 w-4" /> User
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("guardian")}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      role === "guardian"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Users className="h-4 w-4" /> Guardian
                  </button>
                </div>
              </div>

              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-full pl-10" required />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-full pl-10" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 rounded-full pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="confirm-password" type={showConfirmPw ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 rounded-full pl-10 pr-10" required />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle confirm password visibility">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button type="submit" className="h-10 w-full rounded-full" disabled={submitting}>
                {submitting ? "Please wait…" : isSignup ? "Create account" : "Continue with email"}
              </Button>
            </form>

            <div className="mt-4 text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setError("");
                  setConfirmPassword("");
                  setPassword("");
                  setIsSignup(!isSignup);
                }}
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </div>

            <div className="mt-4">
              <Button variant="ghost" className="h-9 w-full rounded-full" onClick={() => navigate("/report")}>
                Continue as anonymous reporter
              </Button>
            </div>
          </div>

          <div className="relative hidden bg-muted lg:block">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
              alt="Nirbhaya interface preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-background/10" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-card/70 px-3 py-1.5 backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Smart safety companion</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
