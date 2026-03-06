import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Globe, Bell, Mail, Key, Save,
  ToggleLeft, ToggleRight, AlertTriangle, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
  >
    <span className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-1"}`} />
  </button>
);

const AdminSettings = () => {
  const { toast } = useToast();

  const [flags, setFlags] = useState({
    maintenanceMode: false,
    signupsEnabled: true,
    emailVerification: true,
    twoFactor: false,
    apiRateLimiting: true,
    autoBackups: true,
    auditLogs: true,
    ipBlocking: false,
  });

  const [general, setGeneral] = useState({
    siteName: "Voxinity",
    supportEmail: "support@voxinity.com",
    maxUsersPerPlan: "Unlimited",
    apiVersion: "v2",
  });

  const toggle = (key: keyof typeof flags) => setFlags((f) => ({ ...f, [key]: !f[key] }));

  const save = (section: string) => {
    toast({ title: `${section} settings saved`, description: "Changes are live immediately." });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure platform-wide behaviour and security</p>
      </motion.div>

      {/* Maintenance banner */}
      {flags.maintenanceMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-3.5"
        >
          <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
          <p className="text-sm font-medium text-yellow-400">Maintenance mode is active — the site is not accessible to users.</p>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Globe size={15} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">General</h3>
          </div>

          {[
            { label: "Site Name", key: "siteName" },
            { label: "Support Email", key: "supportEmail" },
            { label: "API Version", key: "apiVersion" },
          ].map((f) => (
            <div key={f.key}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{f.label}</p>
              <Input
                value={general[f.key as keyof typeof general]}
                onChange={(e) => setGeneral((g) => ({ ...g, [f.key]: e.target.value }))}
                className="h-9 text-sm bg-background border-border rounded-xl"
              />
            </div>
          ))}

          <Button size="sm" className="w-full rounded-xl gap-2 text-xs" onClick={() => save("General")}>
            <Save size={13} /> Save General Settings
          </Button>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield size={15} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Security</h3>
          </div>

          {[
            { key: "twoFactor", label: "Enforce 2FA for Admins", desc: "All admin accounts must use two-factor authentication" },
            { key: "apiRateLimiting", label: "API Rate Limiting", desc: "Prevent abuse with per-IP call limits" },
            { key: "ipBlocking", label: "IP Blocking", desc: "Block access from flagged IP ranges" },
            { key: "auditLogs", label: "Audit Logs", desc: "Record all admin actions to the audit trail" },
          ].map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-4 py-1">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Toggle enabled={flags[item.key as keyof typeof flags]} onToggle={() => toggle(item.key as keyof typeof flags)} />
            </div>
          ))}

          <Button size="sm" className="w-full rounded-xl gap-2 text-xs mt-2" onClick={() => save("Security")}>
            <Save size={13} /> Save Security Settings
          </Button>
        </motion.div>

        {/* Platform toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ToggleRight size={15} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Platform Controls</h3>
          </div>

          {[
            { key: "maintenanceMode", label: "Maintenance Mode", desc: "Take the site offline for all users", danger: true },
            { key: "signupsEnabled", label: "Allow New Signups", desc: "Accept new user registrations" },
            { key: "emailVerification", label: "Email Verification", desc: "Require verified email before access" },
            { key: "autoBackups", label: "Automatic Backups", desc: "Daily encrypted database backups" },
          ].map((item) => (
            <div key={item.key} className={`flex items-start justify-between gap-4 py-1 ${item.danger && flags[item.key as keyof typeof flags] ? "opacity-100" : ""}`}>
              <div>
                <p className={`text-sm font-medium ${item.danger && flags[item.key as keyof typeof flags] ? "text-yellow-400" : "text-foreground"}`}>{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Toggle enabled={flags[item.key as keyof typeof flags]} onToggle={() => toggle(item.key as keyof typeof flags)} />
            </div>
          ))}

          <Button size="sm" className="w-full rounded-xl gap-2 text-xs mt-2" onClick={() => save("Platform")}>
            <Save size={13} /> Save Platform Settings
          </Button>
        </motion.div>

        {/* SMTP / Email */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Mail size={15} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Email / SMTP</h3>
          </div>

          {[
            { label: "SMTP Host", placeholder: "smtp.sendgrid.net" },
            { label: "SMTP Port", placeholder: "587" },
            { label: "SMTP User", placeholder: "apikey" },
            { label: "From Address", placeholder: "no-reply@voxinity.com" },
          ].map((f) => (
            <div key={f.label}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{f.label}</p>
              <Input placeholder={f.placeholder} className="h-9 text-sm bg-background border-border rounded-xl" />
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 rounded-xl gap-2 text-xs" onClick={() => toast({ title: "Test email sent" })}>
              <Mail size={13} /> Test Connection
            </Button>
            <Button size="sm" className="flex-1 rounded-xl gap-2 text-xs" onClick={() => save("Email")}>
              <Save size={13} /> Save
            </Button>
          </div>
        </motion.div>
      </div>

      {/* API Keys section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Key size={15} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
            <p className="text-xs text-muted-foreground">Service integration credentials</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Translation Engine API Key", placeholder: "sk-••••••••••••••••••••" },
            { label: "Stripe Secret Key", placeholder: "sk_live_••••••••••••••••" },
            { label: "SendGrid API Key", placeholder: "SG.••••••••••••••••••" },
            { label: "Analytics Token", placeholder: "pa-••••••••••••••••••" },
          ].map((k) => (
            <div key={k.label}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{k.label}</p>
              <Input type="password" placeholder={k.placeholder} className="h-9 text-sm bg-background border-border rounded-xl font-mono" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-primary">
            <CheckCircle size={13} />
            All keys are encrypted at rest
          </div>
          <Button size="sm" className="rounded-xl gap-2 text-xs" onClick={() => save("API Keys")}>
            <Save size={13} /> Save API Keys
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettings;
