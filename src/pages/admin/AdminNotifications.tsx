import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Users, User, Megaphone, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const templates = [
  { label: "Maintenance Alert", icon: Clock, body: "We'll be performing scheduled maintenance on [DATE] from [TIME]. Services may be briefly unavailable." },
  { label: "New Feature Announcement", icon: Megaphone, body: "Exciting news! We've just launched [FEATURE]. Log in to try it out today." },
  { label: "Plan Renewal Reminder", icon: Bell, body: "Your [PLAN] subscription renews on [DATE]. No action needed — your card on file will be charged." },
];

const AdminNotifications = () => {
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<
    Array<{
      id: number;
      title: string;
      body: string;
      audience: string;
      status: string;
      recipients: number;
      sent_at?: string | null;
      created_at?: string | null;
    }>
  >([]);
  const [stats, setStats] = useState({
    total_sent: 0,
    avg_open_rate: 0,
    click_through_rate: 0,
  });

  const loadNotifications = async () => {
    try {
      setHistoryLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/notifications?limit=120`, {
          method: "GET",
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/admin/notifications/stats`, {
          method: "GET",
          credentials: "include",
        }),
      ]);
      const historyPayload = (await historyRes.json().catch(() => ({}))) as {
        items?: Array<{
          id: number;
          title: string;
          body: string;
          audience: string;
          status: string;
          recipients: number;
          sent_at?: string | null;
          created_at?: string | null;
        }>;
        detail?: string;
      };
      const statsPayload = (await statsRes.json().catch(() => ({}))) as {
        total_sent?: number;
        avg_open_rate?: number;
        click_through_rate?: number;
        detail?: string;
      };
      if (!historyRes.ok) {
        throw new Error(historyPayload.detail || "Failed to fetch notification history.");
      }
      if (!statsRes.ok) {
        throw new Error(statsPayload.detail || "Failed to fetch notification stats.");
      }
      setHistoryItems(Array.isArray(historyPayload.items) ? historyPayload.items : []);
      setStats({
        total_sent: Number(statsPayload.total_sent || 0),
        avg_open_rate: Number(statsPayload.avg_open_rate || 0),
        click_through_rate: Number(statsPayload.click_through_rate || 0),
      });
    } catch (error) {
      setHistoryItems([]);
      setStats({ total_sent: 0, avg_open_rate: 0, click_through_rate: 0 });
      toast({
        title: "Notification load failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const handleSend = async () => {
    if (!title || !body) {
      toast({ title: "Please fill in title and message", variant: "destructive" });
      return;
    }
    try {
      setSending(true);
      const response = await fetch(`${API_BASE}/api/admin/notifications/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audience,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        recipients?: number;
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to send notification.");
      }
      toast({
        title: "Notification sent",
        description: `Delivered to ${Number(payload.recipients || 0).toLocaleString()} recipients.`,
      });
      setTitle("");
      setBody("");
      await loadNotifications();
    } catch (error) {
      toast({
        title: "Send failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Broadcast messages to users and track delivery</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Compose */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Send size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Compose Notification</h3>
              <p className="text-xs text-muted-foreground">Send a push notification to selected users</p>
            </div>
          </div>

          {/* Audience */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Audience</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: "all", label: "All Users", icon: Users },
                { value: "pro", label: "Pro", icon: User },
                { value: "business", label: "Business", icon: User },
                { value: "hobby", label: "Hobby", icon: User },
              ].map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAudience(a.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    audience === a.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <a.icon size={13} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Title</p>
            <Input
              placeholder="Notification title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm bg-background border-border rounded-xl"
            />
          </div>

          {/* Body */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Message</p>
            <textarea
              rows={4}
              placeholder="Write your notification message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{body.length} / 500 characters</p>
            <Button onClick={() => void handleSend()} size="sm" className="rounded-xl gap-2 text-xs" disabled={sending}>
              <Send size={13} /> {sending ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </motion.div>

        {/* Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-foreground">Quick Templates</h3>
          <div className="space-y-2.5">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => { setTitle(t.label); setBody(t.body); }}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <t.icon size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{t.body.substring(0, 50)}…</p>
                </div>
                <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Delivery Stats</p>
            {[
              { label: "Total Sent", value: stats.total_sent.toLocaleString() },
              { label: "Avg. Open Rate", value: `${stats.avg_open_rate.toFixed(1)}%` },
              { label: "Click-through Rate", value: `${stats.click_through_rate.toFixed(1)}%` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xs font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">Notification History</h3>
          <p className="text-xs text-muted-foreground">Previously sent broadcasts</p>
        </div>
        <div className="divide-y divide-border">
          {historyLoading ? (
            <div className="px-6 py-5 text-sm text-muted-foreground">Loading notification history...</div>
          ) : historyItems.length === 0 ? (
            <div className="px-6 py-5 text-sm text-muted-foreground">No notifications sent yet.</div>
          ) : historyItems.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
              className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bell size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.body}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">{n.audience}</span>
                <span>{n.recipients.toLocaleString()} recipients</span>
                <span>{n.sent_at ? new Date(n.sent_at).toLocaleString() : "-"}</span>
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle size={11} /> {n.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminNotifications;
