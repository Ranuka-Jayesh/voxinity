import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Shield, Globe, Palette, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const sections = [
    {
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "Push Notifications", desc: "Get notified when translations are complete", checked: notifications, onChange: setNotifications },
        { label: "Email Digest", desc: "Weekly summary of your activity", checked: emailDigest, onChange: setEmailDigest },
      ],
    },
    {
      title: "Security",
      icon: Shield,
      items: [
        { label: "Two-Factor Authentication", desc: "Extra security for your account", checked: twoFactor, onChange: setTwoFactor },
      ],
    },
    {
      title: "Translation",
      icon: Globe,
      items: [
        { label: "Auto-detect Language", desc: "Automatically detect input language", checked: autoTranslate, onChange: setAutoTranslate },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </motion.div>

      {/* Toggle sections */}
      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + si * 0.08 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <section.icon size={16} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
          </div>
          <div className="space-y-4">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.checked} onCheckedChange={item.onChange} />
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* API Key */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">API Key</h3>
        <div className="flex items-center gap-3">
          <Input
            className="flex-1 rounded-xl font-mono text-xs"
            value={showKey ? "vx_live_k8s92Hf7dL3mN1pQ6wR4tY0xB5cA" : "•".repeat(36)}
            readOnly
          />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm"
      >
        <h3 className="mb-1 text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="mb-4 text-xs text-muted-foreground">These actions are irreversible. Proceed with caution.</p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            Delete All Data
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            Delete Account
          </Button>
        </div>
      </motion.div>

      <div className="flex justify-end">
        <Button className="rounded-xl" onClick={handleSave}>Save All Settings</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
