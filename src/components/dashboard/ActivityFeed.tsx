import { motion } from "framer-motion";
import { Globe, Mic, FileText, Settings, Star } from "lucide-react";

const activities = [
  { icon: Globe, label: "Translated document to Spanish", time: "2 min ago", color: "bg-primary/10 text-primary" },
  { icon: Mic, label: "Voice session — English → French", time: "15 min ago", color: "bg-emerald-100 text-emerald-600" },
  { icon: FileText, label: "Exported meeting transcript", time: "1 hr ago", color: "bg-teal-100 text-teal-600" },
  { icon: Settings, label: "Updated language preferences", time: "3 hrs ago", color: "bg-muted text-muted-foreground" },
  { icon: Star, label: "Saved 3 translation templates", time: "Yesterday", color: "bg-green-100 text-green-600" },
];

const ActivityFeed = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4 }}
    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
  >
    <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h3>
    <div className="space-y-4">
      {activities.map((a, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 + i * 0.06 }}
          className="flex items-center gap-3"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.color}`}>
            <a.icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm text-foreground">{a.label}</p>
            <p className="text-xs text-muted-foreground">{a.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default ActivityFeed;
