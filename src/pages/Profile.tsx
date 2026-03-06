import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Mail, Calendar, Globe, Shield, Languages, Mic, Timer, Clock3, TrendingUp } from "lucide-react";
import { Bar, BarChart, Cell, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  type DangerAction = "signout" | "delete-data" | "delete-account" | null;
  const { toast } = useToast();
  const navigate = useNavigate();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [activeLanguages, setActiveLanguages] = useState(0);
  const [planName, setPlanName] = useState("");
  const [nextBillingText, setNextBillingText] = useState("");
  const [memberSinceText, setMemberSinceText] = useState("");
  const [membershipDurationText, setMembershipDurationText] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [subscriptionAmount, setSubscriptionAmount] = useState<string>("—");
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{
      id: string;
      date: string;
      description: string;
      amount: string;
      status: string;
      invoiceNumber: string;
    }>
  >([]);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityItems, setActivityItems] = useState<
    Array<{
      id: string;
      status: string;
      source_language?: string | null;
      target_language?: string | null;
      input_type?: string | null;
      input_label?: string | null;
      output_path?: string | null;
      created_at?: string | null;
    }>
  >([]);
  const [activityPlaybackUrl, setActivityPlaybackUrl] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    translations: number;
    voice_sessions: number;
    hours_saved: number;
    avg_response_time_sec: number;
    peak_hour: string;
    total_words: number;
    weekly_breakdown: Array<{ day: string; count: number }>;
    languages_used: Array<{ language: string; count: number }>;
    monthly_usage_trend: Array<{ month: string; count: number }>;
  }>({
    translations: 0,
    voice_sessions: 0,
    hours_saved: 0,
    avg_response_time_sec: 0,
    peak_hour: "-",
    total_words: 0,
    weekly_breakdown: [],
    languages_used: [],
    monthly_usage_trend: [],
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          preferred_language: preferredLanguage,
          active_languages: activeLanguages,
          plan_name: planName,
          next_billing_text: nextBillingText,
          member_since_text: memberSinceText,
          membership_duration_text: membershipDurationText,
        }),
      });
      const payload = (await response.json()) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to save profile.");
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (error) {
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to sign out.");
      }
      window.dispatchEvent(new Event("vox-auth-changed"));
      toast({ title: "Signed out", description: "You have been logged out." });
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeletingData(true);
      const response = await fetch(`${API_BASE}/api/auth/delete-all-data`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to delete data.");
      }
      setPreferredLanguage("");
      setActiveLanguages(0);
      setPlanName("");
      setNextBillingText("");
      setMemberSinceText("");
      setMembershipDurationText("");
      window.dispatchEvent(new Event("vox-auth-changed"));
      toast({ title: "All data deleted", description: "Your profile data has been removed." });
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Delete data failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const response = await fetch(`${API_BASE}/api/auth/delete-account`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to delete account.");
      }
      window.dispatchEvent(new Event("vox-auth-changed"));
      toast({ title: "Account deleted", description: "Your account has been removed." });
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Delete account failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      const response = await fetch(`${API_BASE}/api/auth/invoice/download`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Failed to download invoice.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Invoice downloaded", description: "Your PDF invoice is ready." });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleDownloadReceipt = async (invoiceId: string, invoiceNumber: string) => {
    try {
      setDownloadingReceiptId(invoiceId);
      const response = await fetch(`${API_BASE}/api/billing/invoices/${invoiceId}/receipt/download`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Failed to download receipt.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${invoiceNumber || "receipt"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Receipt downloaded", description: "Your payment receipt is ready." });
    } catch (error) {
      toast({
        title: "Receipt download failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  useEffect(() => {
    let alive = true;
    const loadProfile = async () => {
      try {
        const [response, billingResponse, invoicesResponse] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/billing/subscription/me`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/billing/invoices/me`, {
            method: "GET",
            credentials: "include",
          }),
        ]);
        if (!alive) return;
        if (!response.ok) {
          setLoadingProfile(false);
          return;
        }
        const payload = (await response.json()) as {
          user?: {
            full_name?: string | null;
            email?: string | null;
            preferred_language?: string | null;
            active_languages?: number | null;
            plan_name?: string | null;
            next_billing_text?: string | null;
            member_since_text?: string | null;
            membership_duration_text?: string | null;
            created_at?: string | null;
          };
        };
        const user = payload.user;
        setName(user?.full_name ?? "");
        setEmail(user?.email ?? "");
        setPreferredLanguage(user?.preferred_language ?? "");
        setActiveLanguages(typeof user?.active_languages === "number" ? user.active_languages : 0);
        setPlanName(user?.plan_name ?? "");
        setNextBillingText(user?.next_billing_text ?? "");
        setMemberSinceText(user?.member_since_text ?? "");
        setMembershipDurationText(user?.membership_duration_text ?? "");
        setCreatedAt(user?.created_at ?? "");

        if (billingResponse.ok) {
          const billingPayload = (await billingResponse.json().catch(() => ({}))) as {
            subscription?: {
              price_usd?: number | null;
              billing_interval?: string | null;
            } | null;
          };
          const sub = billingPayload.subscription;
          const amount = Number(sub?.price_usd ?? 0);
          const interval = String(sub?.billing_interval || "month").toLowerCase();
          setSubscriptionAmount(
            sub
              ? `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}/${interval === "year" ? "yr" : "mo"}`
              : "—",
          );
        } else {
          setSubscriptionAmount("—");
        }

        if (invoicesResponse.ok) {
          const invoicesPayload = (await invoicesResponse.json().catch(() => ({}))) as {
            items?: Array<{
              id?: string;
              invoice_number?: string | null;
              amount_total?: number | null;
              status?: string | null;
              paid_at?: string | null;
              created_at?: string | null;
            }>;
          };
          const rows = Array.isArray(invoicesPayload.items) ? invoicesPayload.items : [];
          setPaymentHistory(
            rows.map((row) => ({
              id: String(row.id || ""),
              date: row.paid_at ? new Date(row.paid_at).toLocaleDateString() : row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
              description: `${planName || "Subscription"} payment`,
              amount: `$${Number(row.amount_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              status: String(row.status || "paid").replace("_", " ").toUpperCase(),
              invoiceNumber: String(row.invoice_number || "receipt"),
            })),
          );
        } else {
          setPaymentHistory([]);
        }
      } catch {
        setName("");
        setEmail("");
        setPreferredLanguage("");
        setActiveLanguages(0);
        setPlanName("");
        setNextBillingText("");
        setMemberSinceText("");
        setMembershipDurationText("");
        setCreatedAt("");
        setSubscriptionAmount("—");
        setPaymentHistory([]);
      } finally {
        if (alive) setLoadingProfile(false);
      }
    };
    void loadProfile();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  useEffect(() => {
    let alive = true;
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/dub/analytics/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!alive) return;
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          translations: number;
          voice_sessions: number;
          hours_saved: number;
          avg_response_time_sec: number;
          peak_hour: string;
          total_words: number;
          weekly_breakdown: Array<{ day: string; count: number }>;
          languages_used: Array<{ language: string; count: number }>;
          monthly_usage_trend: Array<{ month: string; count: number }>;
        };
        setAnalytics(payload);
      } catch {
        /* keep default analytics */
      } finally {
        if (alive) setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  useEffect(() => {
    let alive = true;
    const loadActivity = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/dub/history/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!alive) return;
        if (!response.ok) {
          setActivityItems([]);
          return;
        }
        const payload = (await response.json()) as Array<{
          id: string;
          status: string;
          source_language?: string | null;
          target_language?: string | null;
          input_type?: string | null;
          input_label?: string | null;
          output_path?: string | null;
          created_at?: string | null;
        }>;
        setActivityItems(Array.isArray(payload) ? payload : []);
      } catch {
        if (!alive) return;
        setActivityItems([]);
      } finally {
        if (alive) setActivityLoading(false);
      }
    };
    void loadActivity();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
    return chars.join("") || "U";
  }, [name]);

  const createdDateText = useMemo(() => {
    if (!createdAt) return "-";
    const dt = new Date(createdAt);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }, [createdAt]);

  const computedActiveLanguages = useMemo(() => {
    const fromAnalytics = analytics.languages_used.filter((item) => item.count > 0).length;
    if (fromAnalytics > 0) return fromAnalytics;
    return activeLanguages > 0 ? activeLanguages : 0;
  }, [analytics.languages_used, activeLanguages]);

  const toBackendVideoUrl = (rawPath?: string | null) => {
    if (!rawPath) return null;
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${window.location.protocol}//${window.location.hostname}:8000/${normalized}`;
  };

  const tabItems = [
    { value: "overview", label: "Overview" },
    { value: "analytics", label: "Analytics" },
    { value: "activity", label: "Activity" },
    { value: "payments", label: "Payments" },
    { value: "settings", label: "Settings" },
  ];
  const preferredLanguageOptions = [
    { value: "English", label: "English" },
    { value: "Sinhala", label: "Sinhala" },
    { value: "Tamil", label: "Tamil" },
    { value: "Japanese", label: "Japanese" },
    { value: "Korean", label: "Korean" },
  ];

  const analyticsCards = [
    { key: "translations", label: "Translations", value: analytics.translations.toLocaleString(), icon: Languages },
    { key: "voice_sessions", label: "Voice Sessions", value: analytics.voice_sessions.toLocaleString(), icon: Mic },
    { key: "hours_saved", label: "Hours Saved", value: analytics.hours_saved.toFixed(2), icon: TrendingUp },
    { key: "avg_response_time_sec", label: "Avg. Response Time", value: `${analytics.avg_response_time_sec.toFixed(1)}s`, icon: Timer },
    { key: "peak_hour", label: "Peak Hour", value: analytics.peak_hour || "-", icon: Clock3 },
  ];

  const piePalette = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  const progressPctByKey: Record<string, number> = {
    translations: Math.max(8, Math.min(100, (analytics.translations / 20) * 100)),
    voice_sessions: Math.max(8, Math.min(100, (analytics.voice_sessions / 20) * 100)),
    hours_saved: Math.max(8, Math.min(100, (analytics.hours_saved / 2) * 100)),
    // Lower response time is better, so invert the scale.
    avg_response_time_sec: Math.max(8, Math.min(100, (1 - Math.min(analytics.avg_response_time_sec, 120) / 120) * 100)),
    peak_hour: analytics.peak_hour && analytics.peak_hour !== "-" ? 72 : 8,
  };

  const renderPlaceholder = (title: string) => (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        This section is ready. Content will be added here next.
      </p>
    </div>
  );

  const closeDangerDialog = () => {
    if (deletingData || deletingAccount || signingOut) return;
    setDangerAction(null);
    setConfirmEmailInput("");
  };

  const requiresEmail = dangerAction === "delete-data" || dangerAction === "delete-account";
  const emailMatches = confirmEmailInput.trim().toLowerCase() === email.trim().toLowerCase();
  const isDangerBusy = deletingData || deletingAccount || signingOut;

  const runDangerAction = async () => {
    if (dangerAction === "signout") {
      await handleSignOut();
      closeDangerDialog();
      return;
    }
    if (!emailMatches) {
      toast({
        title: "Confirmation failed",
        description: "Entered email does not match your account email.",
        variant: "destructive",
      });
      return;
    }
    if (dangerAction === "delete-data") {
      await handleDeleteAllData();
      closeDangerDialog();
      return;
    }
    if (dangerAction === "delete-account") {
      await handleDeleteAccount();
      closeDangerDialog();
    }
  };

  return (
    <main className="py-8">
      <div className="container mx-auto px-4">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-xl font-bold text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your personal information</p>
          </motion.div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-muted/50 p-2">
              {tabItems.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg px-3 py-1.5">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <div className="group relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-4xl font-bold text-primary">
                      {initials}
                    </div>
                    <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera size={14} />
                    </button>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-foreground">
                      {loadingProfile ? "Loading..." : name || "-"}
                    </h2>
                    <p className="text-sm text-muted-foreground">{planName || "Free Plan"}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {email || "-"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {memberSinceText || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="mb-5 text-sm font-semibold text-foreground">Edit Profile</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input className="rounded-xl" value={email} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Preferred Language</Label>
                    <Select value={preferredLanguage || undefined} onValueChange={setPreferredLanguage}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {preferredLanguageOptions.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button className="rounded-xl" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-4 sm:grid-cols-3"
              >
                {[
                  { icon: Globe, label: "Languages", value: String(computedActiveLanguages), sub: "Active languages" },
                  { icon: Shield, label: "Plan", value: planName || "Free Plan", sub: nextBillingText || "No active plan" },
                  { icon: Calendar, label: "Member Since", value: memberSinceText || createdDateText, sub: membershipDurationText || "Created date" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <s.icon size={20} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analyticsCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground">{card.label}</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                          {analyticsLoading ? "-" : card.value}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <card.icon size={16} />
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${progressPctByKey[card.key] ?? 8}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Weekly Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <div className="h-72 w-full rounded-xl bg-muted/20 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weekly_breakdown} barCategoryGap={18}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))",
                        }}
                      />
                      <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Languages Used</h3>
                    <p className="text-xs text-muted-foreground">By target language</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[1fr_150px]">
                    <div className="h-64 w-full rounded-xl bg-muted/20 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.languages_used}
                            dataKey="count"
                            nameKey="language"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={88}
                            paddingAngle={3}
                          >
                            {analytics.languages_used.map((_, idx) => (
                              <Cell key={`lang-cell-${idx}`} fill={piePalette[idx % piePalette.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid hsl(var(--border))",
                              background: "hsl(var(--background))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {analytics.languages_used.slice(0, 6).map((lang, idx) => (
                        <div key={lang.language} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: piePalette[idx % piePalette.length] }}
                            />
                            <span className="text-xs font-medium text-foreground">{lang.language}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{lang.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Monthly Usage Trend</h3>
                    <p className="text-xs text-muted-foreground">Last 6 months</p>
                  </div>
                  <div className="h-64 w-full rounded-xl bg-muted/20 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.monthly_usage_trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value: string) => {
                            const [yy, mm] = value.split("-");
                            const dt = new Date(Number(yy), Number(mm) - 1, 1);
                            return dt.toLocaleDateString(undefined, { month: "short" });
                          }}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 3, fill: "#3b82f6" }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="activity">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-base font-semibold text-foreground">Activity</h3>
                <p className="mt-1 text-sm text-muted-foreground">Recent dubbing jobs for your account.</p>
                <div className="mt-4 space-y-3">
                  {activityLoading ? (
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                  ) : activityItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No dubbing activity found yet.</p>
                  ) : (
                    activityItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border border-border bg-background px-4 py-3 ${
                          item.output_path ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""
                        }`}
                        onClick={() => {
                          const playableUrl = toBackendVideoUrl(item.output_path);
                          if (playableUrl) setActivityPlaybackUrl(playableUrl);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {(item.source_language || "-").toUpperCase()} {"->"} {(item.target_language || "-").toUpperCase()} {"|"} {item.status}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {item.input_type || "input"}: {item.input_label || "-"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                            </p>
                          </div>
                          {toBackendVideoUrl(item.output_path) && (
                            <video
                              src={toBackendVideoUrl(item.output_path) || undefined}
                              className="h-16 w-28 shrink-0 rounded-lg border border-border bg-black object-cover"
                              muted
                            />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="payments" className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-base font-semibold text-foreground">Billing & Plans</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your subscription and payment history
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">Current Subscription</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{planName || "Free Plan"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {nextBillingText || "No active billing cycle"}
                      </p>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {planName ? "Active" : "Starter"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Preferred Language</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{preferredLanguage || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Active Languages</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{activeLanguages || 0}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button className="rounded-xl">Upgrade Plan</Button>
                    <Button variant="outline" className="rounded-xl">
                      Change Plan
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">Billing Details</p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Account Email</p>
                      <p className="mt-1 text-sm font-medium text-foreground break-all">{email || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{memberSinceText || createdDateText}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 w-full rounded-xl"
                    onClick={() => void handleDownloadInvoice()}
                    disabled={downloadingInvoice}
                  >
                    {downloadingInvoice ? "Downloading..." : "Download Invoice"}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-foreground">Payment History</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Recent payments and invoices for your account.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentHistory.length > 0
                        ? paymentHistory
                        : planName
                          ? [
                              {
                                id: "fallback",
                                date: createdDateText !== "-" ? createdDateText : "—",
                                description: `${planName} subscription`,
                                amount: subscriptionAmount,
                                status: "PAID",
                                invoiceNumber: "receipt",
                              },
                            ]
                          : []
                      ).map((row) => (
                        <tr key={`${row.description}-${row.id}`} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-3 text-foreground">{row.date}</td>
                          <td className="px-3 py-3 text-foreground">{row.description}</td>
                          <td className="px-3 py-3 text-foreground">{row.amount}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {row.id !== "fallback" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg px-3 text-xs"
                                onClick={() => void handleDownloadReceipt(row.id, row.invoiceNumber)}
                                disabled={downloadingReceiptId === row.id}
                              >
                                {downloadingReceiptId === row.id ? "Downloading..." : "Receipt"}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!planName && (
                    <p className="px-3 py-5 text-sm text-muted-foreground">
                      No payments yet. Upgrade your plan to start a billing history.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="settings">
              <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
                <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These actions are irreversible. Proceed with caution.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => setDangerAction("delete-data")}
                    disabled={deletingData || deletingAccount || signingOut}
                  >
                    {deletingData ? "Deleting..." : "Delete All Data"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDangerAction("delete-account")}
                    disabled={deletingAccount || deletingData || signingOut}
                  >
                    {deletingAccount ? "Deleting..." : "Delete Account"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDangerAction("signout")}
                    disabled={signingOut || deletingData || deletingAccount}
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog open={dangerAction !== null} onOpenChange={(open) => !open && closeDangerDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {dangerAction === "delete-data" && "Delete All Data"}
              {dangerAction === "delete-account" && "Delete Account"}
              {dangerAction === "signout" && "Sign out"}
            </DialogTitle>
            <DialogDescription>
              {dangerAction === "delete-data" && "This will permanently remove your profile data."}
              {dangerAction === "delete-account" && "This will permanently delete your account and sessions."}
              {dangerAction === "signout" && "You will be logged out from this device."}
            </DialogDescription>
          </DialogHeader>
          {requiresEmail && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Enter your email to confirm
              </Label>
              <Input
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                placeholder={email}
                disabled={isDangerBusy}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDangerDialog} disabled={isDangerBusy}>
              Cancel
            </Button>
            <Button
              variant={dangerAction === "signout" ? "default" : "destructive"}
              onClick={() => void runDangerAction()}
              disabled={isDangerBusy || (requiresEmail && !emailMatches)}
            >
              {dangerAction === "delete-data" && (deletingData ? "Deleting..." : "Confirm Delete All Data")}
              {dangerAction === "delete-account" && (deletingAccount ? "Deleting..." : "Confirm Delete Account")}
              {dangerAction === "signout" && (signingOut ? "Signing out..." : "Confirm Sign out")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(activityPlaybackUrl)} onOpenChange={(open) => !open && setActivityPlaybackUrl(null)}>
        <DialogContent className="w-[95vw] max-w-5xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Dubbed Output</DialogTitle>
            <DialogDescription>Watch the selected output from your activity history.</DialogDescription>
          </DialogHeader>
          {activityPlaybackUrl && (
            <div className="max-h-[78vh] overflow-auto">
              <video
                src={activityPlaybackUrl}
                controls
                autoPlay
                className="h-auto max-h-[70vh] w-full rounded-lg bg-black object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Profile;
