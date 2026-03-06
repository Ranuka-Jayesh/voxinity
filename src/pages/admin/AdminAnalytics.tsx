import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Globe, Zap, Clock, Target, Users, Mic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type PlatformAnalytics = {
  total_jobs: number;
  avg_completion_sec: number;
  success_rate_pct: number;
  active_users_30d: number;
  hours_dubbed_saved: number;
  peak_hour_utc: string;
  jobs_last_7_days: Array<{ date: string; created: number; completed: number }>;
  jobs_by_hour_utc: Array<{ hour: string; count: number }>;
  failure_rate_last_7_days: Array<{ day: string; rate_pct: number }>;
  target_language_share: Array<{ language: string; count: number; pct: number }>;
};

function formatDurationSec(sec: number): string {
  if (!sec || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

const AdminAnalytics = () => {
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/api/admin/analytics/platform`, {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          detail?: string;
        } & Partial<PlatformAnalytics>;
        if (!response.ok) {
          throw new Error(payload.detail || "Failed to load analytics.");
        }
        if (!alive) return;
        setData(payload as PlatformAnalytics);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load analytics.");
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

  const metrics =
    data &&
    [
      {
        label: "Avg. job duration",
        value: formatDurationSec(data.avg_completion_sec),
        icon: Clock,
        color: "text-sky-400",
        bg: "bg-sky-400/10",
      },
      {
        label: "Success rate (45d)",
        value: `${data.success_rate_pct.toFixed(1)}%`,
        icon: Target,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        label: "Total dub jobs",
        value: data.total_jobs.toLocaleString(),
        icon: Zap,
        color: "text-violet-400",
        bg: "bg-violet-400/10",
      },
      {
        label: "Active users (30d)",
        value: data.active_users_30d.toLocaleString(),
        icon: Users,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
      },
    ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Dubbing activity from Supabase (last 45d for charts; total jobs all-time where available).
          Web traffic and geo require separate analytics.
        </p>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Metric pills */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-10 w-10 rounded-xl mb-3" />
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        {!loading &&
          metrics &&
          metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.bg}`}>
                <m.icon size={18} className={m.color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            </motion.div>
          ))}
      </div>

      {!loading && data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10">
              <Mic size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hours dubbed (recent sample)</p>
              <p className="text-lg font-semibold">{data.hours_dubbed_saved.toFixed(2)} h</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
              <Globe size={18} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak job creates (UTC)</p>
              <p className="text-lg font-semibold">{data.peak_hour_utc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Jobs volume — last 7 days */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h3 className="text-sm font-semibold text-foreground mb-0.5">Dub jobs — last 7 days (UTC)</h3>
        <p className="text-xs text-muted-foreground mb-5">Created vs completed per calendar day</p>
        {loading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : data && data.jobs_last_7_days.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.jobs_last_7_days}>
              <defs>
                <linearGradient id="platCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="platCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(200,80%,60%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(200,80%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(150,15%,9%)", border: "1px solid hsl(150,12%,16%)", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="hsl(142,71%,45%)" strokeWidth={2} fill="url(#platCreated)" />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="hsl(200,80%,60%)" strokeWidth={2} fill="url(#platCompleted)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-12 text-center">No job data in window.</p>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Jobs created by hour (UTC)</h3>
          <p className="text-xs text-muted-foreground mb-5">Last 14 days, distribution across 24 hours</p>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : data ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.jobs_by_hour_utc} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(150,15%,9%)", border: "1px solid hsl(150,12%,16%)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-5">Failure rate by day</h3>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : data ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.failure_rate_last_7_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,16%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(150,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "hsl(150,15%,9%)", border: "1px solid hsl(150,12%,16%)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="rate_pct" name="Failure %" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={{ fill: "hsl(0,84%,60%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </motion.div>
      </div>

      {/* Target languages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">Target languages (45d window)</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.target_language_share.length > 0 ? (
          <div className="divide-y divide-border">
            {data.target_language_share.map((g, i) => (
              <motion.div
                key={g.language}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 + i * 0.03 }}
                className="flex items-center gap-4 px-6 py-3.5"
              >
                <p className="w-28 text-sm font-medium text-foreground shrink-0">{g.language}</p>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(g.pct, 100)}%` }}
                    transition={{ delay: 0.45 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <p className="w-12 text-right text-xs font-medium text-primary">{g.pct}%</p>
                <p className="w-16 text-right text-xs text-muted-foreground">{g.count.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-10 text-center px-6">No language breakdown yet.</p>
        )}
      </motion.div>
    </div>
  );
};

export default AdminAnalytics;
