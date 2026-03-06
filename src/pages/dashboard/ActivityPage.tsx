import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, Mic, FileText, Settings, Star, Download, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const allActivities = [
  { icon: Globe, label: "Translated document to Spanish", detail: "business-proposal.pdf — 2,400 words", time: "2 min ago", color: "bg-primary/10 text-primary" },
  { icon: Mic, label: "Voice session — English → French", detail: "Duration: 12 min — 98.2% accuracy", time: "15 min ago", color: "bg-emerald-100 text-emerald-600" },
  { icon: FileText, label: "Exported meeting transcript", detail: "team-standup-jan15.txt", time: "1 hr ago", color: "bg-teal-100 text-teal-600" },
  { icon: Download, label: "Downloaded translation package", detail: "marketing-assets-de.zip", time: "2 hrs ago", color: "bg-green-100 text-green-600" },
  { icon: Settings, label: "Updated language preferences", detail: "Added Korean, removed Italian", time: "3 hrs ago", color: "bg-muted text-muted-foreground" },
  { icon: Star, label: "Saved 3 translation templates", detail: "Email, Legal, Marketing templates", time: "5 hrs ago", color: "bg-green-100 text-green-600" },
  { icon: Globe, label: "Translated website copy to German", detail: "landing-page.html — 1,850 words", time: "Yesterday", color: "bg-primary/10 text-primary" },
  { icon: Mic, label: "Voice session — Spanish → English", detail: "Duration: 8 min — 97.5% accuracy", time: "Yesterday", color: "bg-emerald-100 text-emerald-600" },
  { icon: Trash2, label: "Deleted expired translations", detail: "Removed 12 items older than 30 days", time: "2 days ago", color: "bg-destructive/10 text-destructive" },
  { icon: FileText, label: "Generated invoice translation", detail: "invoice-2024-001.pdf — Japanese", time: "3 days ago", color: "bg-teal-100 text-teal-600" },
];

const ActivityPage = () => {
  const [search, setSearch] = useState("");
  const filtered = allActivities.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.detail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground">Your complete activity timeline</p>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search activity..."
          className="rounded-xl py-5 pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Activity list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No activity found.</div>
        )}
        {filtered.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 transition-colors hover:bg-muted/30"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.color}`}>
              <a.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{a.label}</p>
              <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ActivityPage;
