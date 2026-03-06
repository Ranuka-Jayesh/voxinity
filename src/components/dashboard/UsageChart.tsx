import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { day: "Mon", translations: 120, sessions: 40 },
  { day: "Tue", translations: 180, sessions: 55 },
  { day: "Wed", translations: 150, sessions: 48 },
  { day: "Thu", translations: 220, sessions: 70 },
  { day: "Fri", translations: 280, sessions: 85 },
  { day: "Sat", translations: 190, sessions: 60 },
  { day: "Sun", translations: 140, sessions: 45 },
];

const UsageChart = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
  >
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Weekly Usage</h3>
        <p className="text-xs text-muted-foreground">Translations & voice sessions</p>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Translations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Sessions
        </span>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(152, 69%, 50%)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="hsl(152, 69%, 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 88%)" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(150, 10%, 40%)" />
        <YAxis tick={{ fontSize: 12 }} stroke="hsl(150, 10%, 40%)" />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid hsl(150, 10%, 88%)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="translations"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth={2}
          fill="url(#gradPrimary)"
        />
        <Area
          type="monotone"
          dataKey="sessions"
          stroke="hsl(152, 69%, 50%)"
          strokeWidth={2}
          fill="url(#gradSecondary)"
        />
      </AreaChart>
    </ResponsiveContainer>
  </motion.div>
);

export default UsageChart;
