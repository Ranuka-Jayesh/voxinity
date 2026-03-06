import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CreditCard,
  Zap,
  Activity,
  Globe,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type OverviewPayload = {
  total_users: number;
  active_users: number;
  mrr_usd: number;
  paying_users: number;
  dub_jobs_today: number;
  dub_jobs_created_7d: number;
  dub_completed_7d: number;
  dub_failed_7d: number;
  dub_failed_24h: number;
  jobs_by_day_7d: Array<{ day: string; count: number }>;
  revenue_last_6_months: Array<{ month: string; revenue: number }>;
  recent_signups: Array<{
    name: string;
    email: string;
    plan: string;
    joined: string;
    status: string;
  }>;
  alerts: Array<{ level: string; text: string; time: string }>;
};

const planColors: Record<string, string> = {
  Hobby: "bg-muted text-muted-foreground",
  Pro: "bg-primary/15 text-primary",
  Business: "bg-violet-400/15 text-violet-400",
};

const alertColors: Record<string, string> = {
  error: "bg-destructive/10 text-destructive border-destructive/20",
  warn: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

const AdminOverview = () => {
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/admin/overview`, {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          detail?: string;
        } & Partial<OverviewPayload>;
        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load overview.");
        }
        if (!alive) return;
        setData(payload as OverviewPayload);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load overview.");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Total users",
        value: data.total_users.toLocaleString(),
        sub: `${data.active_users.toLocaleString()} active`,
        icon: Users,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        label: "Est. MRR",
        value: `$${data.mrr_usd.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`,
        sub:
          data.paying_users > 0
            ? `${data.paying_users} paying`
            : "No subscription revenue",
        icon: CreditCard,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
      },
      {
        label: "Dub jobs (7d)",
        value: data.dub_jobs_created_7d.toLocaleString(),
        sub: `${data.dub_completed_7d.toLocaleString()} completed`,
        icon: Activity,
        color: "text-sky-400",
        bg: "bg-sky-400/10",
      },
      {
        label: "Dub jobs today",
        value: data.dub_jobs_today.toLocaleString(),
        sub: `${data.dub_failed_24h} failed (24h)`,
        icon: Zap,
        color: "text-violet-400",
        bg: "bg-violet-400/10",
      },
    ];
  }, [data]);

  const revenueData = data?.revenue_last_6_months ?? [];
  const signupData = data?.jobs_by_day_7d ?? [];

  return (
    <div className="space-y-7">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">
          Platform health, subscription snapshot, and dubbing activity
        </p>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="mt-2 h-3 w-36" />
            </div>
          ))}
        {!loading &&
          kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg}`}>
                  <k.icon size={15} className={k.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{k.sub}</p>
            </motion.div>
          ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Subscription volume by month
          </h3>
          <p className="text-xs text-muted-foreground mb-5">
            Sum of subscription prices created in each month (last 6 rolling windows)
          </p>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(150,15%,9%)",
                    border: "1px solid hsl(150,12%,16%)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${Number(v).toLocaleString()}`, "Volume"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142,71%,45%)"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Dub jobs created</h3>
          <p className="text-xs text-muted-foreground mb-5">Last 7 days by day (UTC)</p>
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={signupData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(150,15%,9%)",
                    border: "1px solid hsl(150,12%,16%)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(142,71%,45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent users + Alerts */}
      <div className="grid gap-5 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent signups</h3>
              <p className="text-xs text-muted-foreground">Newest registered users</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Live
            </span>
          </div>
          <div className="divide-y divide-border">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            {!loading &&
              (data?.recent_signups?.length ? (
                data.recent_signups.map((u, i) => (
                  <motion.div
                    key={`${u.email}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${planColors[u.plan] ?? planColors.Hobby}`}
                    >
                      {u.plan}
                    </span>
                    <div className="text-right">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      <p className="text-[11px] text-muted-foreground mt-0.5">{u.joined}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">No users yet.</p>
              ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground">Signals</h3>
            <p className="text-xs text-muted-foreground">Failures and moderation</p>
          </div>
          <div className="p-4 space-y-3">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            {!loading &&
              data?.alerts?.map((a, i) => {
                const level = a.level === "warning" ? "warn" : a.level;
                const Icon =
                  level === "error" ? ShieldAlert : level === "warn" ? Clock : Globe;
                return (
                  <motion.div
                    key={`${a.text}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.05 }}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${alertColors[level] ?? alertColors.info}`}
                  >
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{a.text}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{a.time}</p>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOverview;
