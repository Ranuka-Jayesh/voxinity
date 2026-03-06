import { motion } from "framer-motion";
import { Globe, Mic, Clock, TrendingUp } from "lucide-react";

const stats = [
  { label: "Translations", value: "1,284", change: "+12%", icon: Globe, color: "text-primary" },
  { label: "Voice Sessions", value: "342", change: "+8%", icon: Mic, color: "text-emerald-600" },
  { label: "Hours Saved", value: "56.2", change: "+23%", icon: Clock, color: "text-teal-600" },
  { label: "Accuracy", value: "98.4%", change: "+1.2%", icon: TrendingUp, color: "text-green-600" },
];

const StatsCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {stats.map((stat, i) => (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        whileHover={{ y: -2 }}
        className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
          <div className={`rounded-xl bg-primary/10 p-2.5 ${stat.color}`}>
            <stat.icon size={20} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <span className="text-xs font-semibold text-primary">{stat.change}</span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      </motion.div>
    ))}
  </div>
);

export default StatsCards;
