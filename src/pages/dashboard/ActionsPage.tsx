import { motion } from "framer-motion";
import { Mic, FileUp, Languages, Key, Headphones, BookOpen, Zap, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const actions = [
  { icon: Mic, label: "New Voice Session", desc: "Start real-time translation", accent: "bg-primary/10 text-primary" },
  { icon: FileUp, label: "Upload Document", desc: "Translate files instantly", accent: "bg-emerald-100 text-emerald-600" },
  { icon: Languages, label: "Manage Languages", desc: "Add or remove languages", accent: "bg-teal-100 text-teal-600" },
  { icon: Key, label: "API Keys", desc: "View & manage your keys", accent: "bg-green-100 text-green-600" },
  { icon: Zap, label: "Batch Translate", desc: "Process multiple files", accent: "bg-primary/10 text-primary" },
  { icon: RefreshCw, label: "Sync Settings", desc: "Sync across devices", accent: "bg-muted text-muted-foreground" },
  { icon: Share2, label: "Share Templates", desc: "Collaborate with team", accent: "bg-emerald-100 text-emerald-600" },
  { icon: Headphones, label: "Contact Support", desc: "Get help from our team", accent: "bg-teal-100 text-teal-600" },
  { icon: BookOpen, label: "Documentation", desc: "Read the full API docs", accent: "bg-green-100 text-green-600" },
];

const ActionsPage = () => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Quick Actions</h1>
        <p className="text-sm text-muted-foreground">Common tasks at your fingertips</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast({ title: a.label, description: `${a.desc} — coming soon!` })}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.accent}`}>
              <a.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{a.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ActionsPage;
