import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, CreditCard, Users, ArrowUpRight, Download,
  ChevronLeft, ChevronRight, RefreshCw, XCircle,
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const statusStyles: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  trialing: "bg-sky-500/10 text-sky-400",
  past_due: "bg-yellow-500/10 text-yellow-400",
  canceled: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const planColors: Record<string, string> = {
  Hobby: "bg-muted text-muted-foreground",
  Pro: "bg-primary/15 text-primary",
  Business: "bg-violet-400/15 text-violet-400",
};

const AdminSubscriptions = () => {
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [tab, setTab] = useState<"all" | "active" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ mrr: 0, arr: 0, paying_users: 0, arpu: 0 });
  const [mrrData, setMrrData] = useState<Array<{ month: string; mrr: number }>>([]);
  const [planDist, setPlanDist] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [subscriptions, setSubscriptions] = useState<
    Array<{
      subscription_id: string;
      id: string;
      user: string;
      email: string;
      plan: string;
      amount: string;
      status: string;
      renewal: string;
      since: string;
    }>
  >([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        tab,
        search: search.trim(),
        limit: "400",
      });
      const response = await fetch(`${API_BASE}/api/admin/subscriptions?${query.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        summary?: { mrr?: number; arr?: number; paying_users?: number; arpu?: number };
        mrr_data?: Array<{ month: string; mrr: number }>;
        plan_distribution?: Array<{ name: string; value: number; color: string }>;
        items?: Array<{
          subscription_id: string;
          id: string;
          user: string;
          email: string;
          plan: string;
          amount: string;
          status: string;
          renewal: string;
          since: string;
        }>;
      };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to load subscriptions.");
      }
      setSummary({
        mrr: Number(payload.summary?.mrr || 0),
        arr: Number(payload.summary?.arr || 0),
        paying_users: Number(payload.summary?.paying_users || 0),
        arpu: Number(payload.summary?.arpu || 0),
      });
      setMrrData(Array.isArray(payload.mrr_data) ? payload.mrr_data : []);
      setPlanDist(Array.isArray(payload.plan_distribution) ? payload.plan_distribution : []);
      setSubscriptions(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setSummary({ mrr: 0, arr: 0, paying_users: 0, arpu: 0 });
      setMrrData([]);
      setPlanDist([]);
      setSubscriptions([]);
      toast({
        title: "Subscriptions load failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subscriptions;
    const q = search.trim().toLowerCase();
    return subscriptions.filter((s) =>
      `${s.id} ${s.user} ${s.email} ${s.plan} ${s.status}`.toLowerCase().includes(q),
    );
  }, [subscriptions, search]);

  const onRenew = async (subscriptionId: string, displayId: string) => {
    try {
      setSubmittingId(subscriptionId);
      const response = await fetch(`${API_BASE}/api/admin/subscriptions/${subscriptionId}/renew`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) throw new Error(payload.detail || "Failed to renew subscription.");
      toast({ title: `Renewed ${displayId}` });
      await loadData();
    } catch (error) {
      toast({
        title: "Renew failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const onCancel = async (subscriptionId: string, displayId: string) => {
    try {
      setSubmittingId(subscriptionId);
      const response = await fetch(`${API_BASE}/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) throw new Error(payload.detail || "Failed to cancel subscription.");
      toast({ title: `Cancelled ${displayId}`, variant: "destructive" });
      await loadData();
    } catch (error) {
      toast({
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const onExport = async () => {
    try {
      const query = new URLSearchParams({
        tab,
        search: search.trim(),
        limit: "1000",
      });
      const response = await fetch(`${API_BASE}/api/admin/subscriptions/export?${query.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDownloadReceipt = async (subscriptionId: string, displayId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/subscriptions/${subscriptionId}/receipt`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Failed to download receipt.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${displayId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Receipt downloaded" });
    } catch (error) {
      toast({
        title: "Receipt download failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Revenue, plan distribution, and subscription management</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "MRR", value: `$${summary.mrr.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, change: "Live", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "ARR", value: `$${summary.arr.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, change: "Live", icon: CreditCard, color: "text-violet-400", bg: "bg-violet-400/10" },
          { label: "Paying Users", value: summary.paying_users.toLocaleString(), change: "Live", icon: Users, color: "text-sky-400", bg: "bg-sky-400/10" },
          { label: "Avg. Revenue/User", value: `$${summary.arpu.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, change: "Live", icon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon size={15} className={k.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
            <p className="mt-1 text-xs font-medium text-primary">{k.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-0.5">MRR Growth</h3>
          <p className="text-xs text-muted-foreground mb-5">Monthly recurring revenue — recent 6 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrData}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "hsl(150,15%,9%)", border: "1px solid hsl(150,12%,16%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]} />
              <Area type="monotone" dataKey="mrr" stroke="hsl(142,71%,45%)" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Plan Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">% of paying subscribers</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {planDist.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(150,15%,9%)", border: "1px solid hsl(150,12%,16%)", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {planDist.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-medium text-foreground">{p.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Subscriptions table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">All Subscriptions</h3>
            <p className="text-xs text-muted-foreground">Manage individual subscriber records</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-muted/40 p-0.5">
              {(["all", "active", "cancelled"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none"
            />
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1.5" onClick={() => void onExport()}>
              <Download size={12} /> Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Renewal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Since</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-muted-foreground" colSpan={8}>Loading subscriptions...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-muted-foreground" colSpan={8}>No subscriptions found.</td>
                </tr>
              ) : filtered.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-muted/20 transition-colors group"
                >
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{s.id}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-foreground">{s.user}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${planColors[s.plan]}`}>{s.plan}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-foreground">{s.amount}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusStyles[s.status]}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.renewal}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.since}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => void onDownloadReceipt(s.subscription_id, s.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Download receipt"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => void onRenew(s.subscription_id, s.id)}
                        disabled={submittingId === s.subscription_id}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => void onCancel(s.subscription_id, s.id)}
                        disabled={submittingId === s.subscription_id}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} records</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg"><ChevronLeft size={13} /></Button>
            <Button variant="default" size="sm" className="h-8 w-8 p-0 rounded-lg text-xs">1</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg"><ChevronRight size={13} /></Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSubscriptions;
