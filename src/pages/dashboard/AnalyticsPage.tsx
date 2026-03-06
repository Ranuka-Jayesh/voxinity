import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const weeklyData = [
  { day: "Mon", translations: 120, sessions: 40 },
  { day: "Tue", translations: 180, sessions: 55 },
  { day: "Wed", translations: 150, sessions: 48 },
  { day: "Thu", translations: 220, sessions: 70 },
  { day: "Fri", translations: 280, sessions: 85 },
  { day: "Sat", translations: 190, sessions: 60 },
  { day: "Sun", translations: 140, sessions: 45 },
];

const monthlyData = [
  { month: "Jan", usage: 820 },
  { month: "Feb", usage: 1100 },
  { month: "Mar", usage: 950 },
  { month: "Apr", usage: 1350 },
  { month: "May", usage: 1580 },
  { month: "Jun", usage: 1284 },
];

const languageData = [
  { name: "Spanish", value: 35, color: "hsl(142, 71%, 45%)" },
  { name: "French", value: 25, color: "hsl(152, 69%, 50%)" },
  { name: "German", value: 18, color: "hsl(160, 60%, 45%)" },
  { name: "Japanese", value: 12, color: "hsl(170, 50%, 40%)" },
  { name: "Others", value: 10, color: "hsl(150, 10%, 70%)" },
];

const topMetrics = [
  { label: "Avg. Response Time", value: "1.2s", sub: "↓ 0.3s from last month" },
  { label: "Accuracy Rate", value: "98.4%", sub: "↑ 1.2% improvement" },
  { label: "Peak Hour", value: "2–4 PM", sub: "Most active window" },
  { label: "Total Words", value: "284K", sub: "Processed this month" },
];

const AnalyticsPage = () => (
  <div className="space-y-6">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>
      <p className="text-sm text-muted-foreground">Detailed insights into your translation usage</p>
    </motion.div>

    {/* Top metrics */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {topMetrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{m.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
        </motion.div>
      ))}
    </div>

    {/* Charts row */}
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Weekly area chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2"
      >
        <h3 className="mb-1 text-sm font-semibold text-foreground">Weekly Breakdown</h3>
        <p className="mb-4 text-xs text-muted-foreground">Translations & voice sessions by day</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="aGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="aGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152,69%,50%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(152,69%,50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,10%,88%)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(150,10%,50%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(150,10%,50%)" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(150,10%,88%)", fontSize: 12 }} />
            <Area type="monotone" dataKey="translations" stroke="hsl(142,71%,45%)" strokeWidth={2} fill="url(#aGrad1)" />
            <Area type="monotone" dataKey="sessions" stroke="hsl(152,69%,50%)" strokeWidth={2} fill="url(#aGrad2)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Language pie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h3 className="mb-1 text-sm font-semibold text-foreground">Languages Used</h3>
        <p className="mb-4 text-xs text-muted-foreground">Distribution by target language</p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={languageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {languageData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
          {languageData.map((l) => (
            <span key={l.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      </motion.div>
    </div>

    {/* Monthly bar */}
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h3 className="mb-1 text-sm font-semibold text-foreground">Monthly Usage Trend</h3>
      <p className="mb-4 text-xs text-muted-foreground">Total translations per month</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,10%,88%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(150,10%,50%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(150,10%,50%)" />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(150,10%,88%)", fontSize: 12 }} />
          <Bar dataKey="usage" fill="hsl(142,71%,45%)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  </div>
);

export default AnalyticsPage;
