import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, User, Eye, EyeOff, Sparkles, Shield, Users, ShieldCheck,
  MapPin, Phone as PhoneIcon, Camera, ChevronRight, ChevronLeft, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth, type UserRole } from "@/lib/auth";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1); // 1 = basics, 2 = onboarding
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [role, setRole] = useState<UserRole>("user");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Onboarding fields
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const { login, signup, exitGuestMode, enterGuestMode } = useAuth();
  const navigate = useNavigate();

  // Exit guest mode when user lands on login page
  useEffect(() => { exitGuestMode(); }, [exitGuestMode]);

  const isMinor = age ? Number(age) < 18 : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignup) {
      // Login flow
      if (!email.includes("@") || !email.includes(".")) { setError("Please enter a valid email address."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setError(""); setSubmitting(true);
      try {
        const err = await login(email.trim(), password, role);
        if (err) { setError(err); }
        else { navigate(role === "admin" ? "/admin" : role === "guardian" ? "/guardian" : "/dashboard"); }
      } catch { setError("Something went wrong."); } finally { setSubmitting(false); }
      return;
    }

    // Signup flow — step 1 validation
    if (signupStep === 1) {
      if (name.trim().length < 2) { setError("Please enter your full name."); return; }
      if (!email.includes("@") || !email.includes(".")) { setError("Please enter a valid email."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      setError("");
      setSignupStep(2);
      return;
    }

    // Signup flow — step 2 (onboarding) submission
    if (!age || Number(age) < 5 || Number(age) > 120) { setError("Please enter a valid age."); return; }
    if (isMinor && (!guardianName || !guardianPhone)) { setError("Guardian details are required for users under 18."); return; }

    setError(""); setSubmitting(true);
    try {
      const err = await signup({
        username: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
        age: Number(age),
        address: address.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        profilePic: profilePic.trim() || undefined,
      });
      if (err) { setError(err); }
      else { navigate(role === "admin" ? "/admin" : role === "guardian" ? "/guardian" : "/dashboard"); }
    } catch { setError("Something went wrong."); } finally { setSubmitting(false); }
  };

  const handleGoogleContinue = async () => {
    setError("");
    setSubmitting(true);
    // Use role-specific demo accounts so each role shows the correct name
    const demoAccounts: Record<UserRole, { email: string; password: string }> = {
      user: { email: "priya@nirbhaya.app", password: "demo123" },
      guardian: { email: "guardian@nirbhaya.app", password: "demo123" },
      admin: { email: "admin@nirbhaya.app", password: "demo123" },
    };
    const { email: demoEmail, password: demoPw } = demoAccounts[role];
    const err = await login(demoEmail, demoPw, role);
    if (err) { setError(err); setSubmitting(false); return; }
    setSubmitting(false);
    navigate(role === "admin" ? "/admin" : role === "guardian" ? "/guardian" : "/dashboard");
  };

  const resetForm = () => {
    setError(""); setConfirmPassword(""); setPassword("");
    setSignupStep(1); setAge(""); setPhone(""); setAddress("");
    setGuardianName(""); setGuardianPhone(""); setProfilePic("");
    setIsSignup(!isSignup);
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
              {isSignup ? (signupStep === 1 ? "Create your account" : "Complete your profile") : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {isSignup
                ? signupStep === 1 ? "Set up your Nirbhaya profile" : "Help us keep you safe — just a few more details"
                : "Sign in and continue safer journeys"}
            </p>

            {/* Step indicator for signup */}
            {isSignup && (
              <div className="mt-3 flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${signupStep >= 1 ? "bg-primary" : "bg-muted"}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${signupStep >= 2 ? "bg-primary" : "bg-muted"}`} />
              </div>
            )}

            {!isSignup && (
              <div className="mt-5">
                <Button type="button" variant="outline" className="h-10 w-full rounded-full" onClick={handleGoogleContinue} disabled={submitting}>
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold">D</span>
                  Quick Demo Login
                </Button>
                <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="flex-1" /> or <Separator className="flex-1" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Role selector */}
              <div className="space-y-1.5">
                <Label>I am a</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: "user" as UserRole, icon: Shield, label: "User" },
                    { val: "guardian" as UserRole, icon: Users, label: "Guardian" },
                    { val: "admin" as UserRole, icon: ShieldCheck, label: "Admin" },
                  ]).map((r) => (
                    <button key={r.val} type="button" onClick={() => setRole(r.val)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        role === r.val
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                      }`}>
                      <r.icon className="h-4 w-4" /> {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {(!isSignup || signupStep === 1) && (
                  <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
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
                  </motion.div>
                )}

                {isSignup && signupStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="age">Age</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="age" type="number" placeholder="25" min={5} max={120} value={age} onChange={(e) => setAge(e.target.value)} className="h-10 rounded-full pl-10" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone</Label>
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="phone" type="tel" placeholder="+91 99999 99999" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-full pl-10" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="address" placeholder="Your home address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-10 rounded-full pl-10" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profilePic">Profile picture URL</Label>
                      <div className="relative">
                        <Camera className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="profilePic" placeholder="https://..." value={profilePic} onChange={(e) => setProfilePic(e.target.value)} className="h-10 rounded-full pl-10" />
                      </div>
                    </div>

                    {/* Guardian details — required if minor, optional otherwise */}
                    <div className={`space-y-3 p-3 rounded-2xl border transition-colors ${isMinor ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-muted/20"}`}>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Guardian Details {isMinor && <span className="text-amber-500 text-xs ml-1">(Required)</span>}</Label>
                        {isMinor && <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">Under 18</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="guardianName" className="text-xs">Guardian Name</Label>
                          <Input id="guardianName" placeholder="Parent / Guardian" value={guardianName} onChange={(e) => setGuardianName(e.target.value)}
                            className="h-9 rounded-full text-sm" required={isMinor} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="guardianPhone" className="text-xs">Guardian Phone</Label>
                          <Input id="guardianPhone" type="tel" placeholder="+91 99999 99999" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
                            className="h-9 rounded-full text-sm" required={isMinor} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-2">
                {isSignup && signupStep === 2 && (
                  <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => { setSignupStep(1); setError(""); }}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                )}
                <Button type="submit" className="h-10 flex-1 rounded-full" disabled={submitting}>
                  {submitting ? "Please wait…"
                    : !isSignup ? "Continue with email"
                    : signupStep === 1 ? (<>Next <ChevronRight className="h-4 w-4 ml-1" /></>)
                    : "Create account"
                  }
                </Button>
              </div>
            </form>

            <div className="mt-4 text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={resetForm}>
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </div>

            <div className="mt-4">
              <Button variant="ghost" className="h-9 w-full rounded-full" onClick={() => { enterGuestMode(); navigate("/report"); }}>
                Continue as anonymous reporter
              </Button>
            </div>
          </div>

          <div className="relative hidden bg-muted lg:block">
            <img
              src="https://i.ibb.co/TqJkPBCZ/Whats-App-Image-2026-02-28-at-1-54-29-AM.jpg"
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
