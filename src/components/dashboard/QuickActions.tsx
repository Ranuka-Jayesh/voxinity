import { motion } from "framer-motion";
import { Mic, FileUp, Languages, Key, Headphones, BookOpen } from "lucide-react";

const actions = [
  { icon: Mic, label: "New Voice Session", desc: "Start translating live" },
  { icon: FileUp, label: "Upload Document", desc: "Translate files instantly" },
  { icon: Languages, label: "Manage Languages", desc: "Add or remove languages" },
  { icon: Key, label: "API Keys", desc: "View & manage your keys" },
  { icon: Headphones, label: "Support", desc: "Get help from our team" },
  { icon: BookOpen, label: "Documentation", desc: "Read the full docs" },
];

const QuickActions = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5 }}
    className="rounded-2xl border border-border bg-card p-6 shadow-sm"
  >
    <h3 className="mb-4 text-sm font-semibold text-foreground">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((a, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <a.icon size={20} />
          </div>
          <span className="text-xs font-medium text-foreground">{a.label}</span>
          <span className="text-[10px] leading-tight text-muted-foreground">{a.desc}</span>
        </motion.button>
      ))}
    </div>
  </motion.div>
);

export default QuickActions;
