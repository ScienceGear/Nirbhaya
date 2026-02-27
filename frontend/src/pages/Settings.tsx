import { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Globe, Bell, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [voiceSOS, setVoiceSOS] = useState(false);

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="container mx-auto max-w-xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display text-3xl font-bold mb-2">{t("nav.settings")}</h1>
        </motion.div>

        {user && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Theme */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                <div>
                  <p className="font-medium text-sm">{t("settings.theme")}</p>
                  <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </div>
          </div>

          {/* Language */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t("settings.language")}</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred language</p>
                </div>
              </div>
              <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="mr">मराठी</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notifications */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <p className="font-medium text-sm">Notifications</p>
            </div>
            <div className="space-y-3 pl-8">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Push Notifications</Label>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Proximity Alerts</Label>
                <Switch checked={proximityAlerts} onCheckedChange={setProximityAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Voice SOS Always-on</Label>
                <Switch checked={voiceSOS} onCheckedChange={setVoiceSOS} />
              </div>
            </div>
          </div>

          {/* About */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Nirbhaya v1.0</p>
                <p className="text-xs text-muted-foreground">WS002 Hackathon • Team Hustlecult 3.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
