import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Search, Eye, Trash2, Flag, CheckCircle,
  Clock, AlertTriangle, Download, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  completed: { color: "bg-primary/10 text-primary", icon: CheckCircle },
  processing: { color: "bg-sky-400/10 text-sky-400", icon: Clock },
  failed: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

const AdminContent = () => {
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [summary, setSummary] = useState({
    total_jobs: 0,
    processing: 0,
    flagged: 0,
    failed: 0,
  });
  const [items, setItems] = useState<
    Array<{
      id: string;
      user: string;
      source: string;
      target: string;
      words: number;
      status: "completed" | "processing" | "failed";
      flagged: boolean;
      created: string;
      preview: string;
      output_path?: string | null;
    }>
  >([]);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const loadContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        language: languageFilter,
      });
      const response = await fetch(`${API_BASE}/api/admin/content?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        summary?: { total_jobs: number; processing: number; flagged: number; failed: number };
        items?: Array<{
          id: string;
          user: string;
          source: string;
          target: string;
          words: number;
          status: "completed" | "processing" | "failed";
          flagged: boolean;
          created: string;
          preview: string;
          output_path?: string | null;
        }>;
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to fetch content.");
      }
      setSummary(payload.summary || { total_jobs: 0, processing: 0, flagged: 0, failed: 0 });
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setSummary({ total_jobs: 0, processing: 0, flagged: 0, failed: 0 });
      setItems([]);
      toast({
        title: "Content fetch failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadContent();
  }, [debouncedSearch, statusFilter, languageFilter]);

  const toBackendVideoUrl = (rawPath?: string | null) => {
    if (!rawPath) return null;
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${window.location.protocol}//${window.location.hostname}:8000/${normalized}`;
  };

  const toggleFlag = async (item: { id: string; flagged: boolean }) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/content/${item.id}/flag`,
        {
          method: item.flagged ? "DELETE" : "POST",
          credentials: "include",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) {
        const d = payload.detail || "";
        const migrationRelated =
          /dubbing_jobs_moderation|Moderation columns|admin_content_flags|Moderation table|is_flagged/i.test(
            d,
          );
        if (migrationRelated) {
          throw new Error(
            "Supabase is missing moderation columns on dubbing_jobs. In SQL Editor, run backend/sql/dubbing_jobs_moderation_columns.sql (after dubbing_tables.sql and admin_auth_tables.sql), then restart the API.",
          );
        }
        throw new Error(d || "Failed to update flag.");
      }
      toast({
        title: item.flagged ? "Flag removed" : "Content flagged",
        description: "Content moderation state updated.",
      });
      await loadContent();
    } catch (error) {
      toast({
        title: "Flag update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/content/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to delete content.");
      }
      toast({ title: `Deleted ${itemId}` });
      await loadContent();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportContent = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        language: languageFilter,
      });
      const response = await fetch(`${API_BASE}/api/admin/content/export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "Failed to export content.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-content-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "CSV file downloaded." });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Content</h1>
        <p className="text-sm text-muted-foreground">Review translation jobs, flagged content, and usage</p>
      </motion.div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Jobs", value: summary.total_jobs.toLocaleString(), color: "text-foreground" },
          { label: "Processing", value: summary.processing.toLocaleString(), color: "text-sky-400" },
          { label: "Flagged", value: summary.flagged.toLocaleString(), color: "text-yellow-400" },
          { label: "Failed", value: summary.failed.toLocaleString(), color: "text-destructive" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card px-5 py-4"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ID or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {["all", "completed", "processing", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {[
            { value: "all", label: "All Languages" },
            { value: "en", label: "EN" },
            { value: "si", label: "SI" },
            { value: "ta", label: "TA" },
            { value: "auto", label: "AUTO" },
          ].map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguageFilter(l.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium uppercase transition-colors ${
                languageFilter === l.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-9 rounded-xl text-xs gap-1.5"
          onClick={() => void exportContent()}
          disabled={exporting}
        >
          <Download size={12} /> {exporting ? "Exporting..." : "Export"}
        </Button>
      </motion.div>

      {/* Content cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading content items...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No content items found for current filters.
          </div>
        ) : items.map((item, i) => {
          const sc = statusConfig[item.status];
          const StatusIcon = sc.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/10 ${item.flagged ? "border-yellow-500/30" : "border-border"}`}
              onClick={() => {
                const playable = toBackendVideoUrl(item.output_path);
                if (playable) setPlaybackUrl(playable);
              }}
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Left preview */}
                <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  {toBackendVideoUrl(item.output_path) ? (
                    <video
                      src={toBackendVideoUrl(item.output_path) || undefined}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FileText size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-medium text-foreground">{item.id}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium flex items-center gap-1 ${sc.color}`}>
                      <StatusIcon size={10} /> {item.status}
                    </span>
                    {item.flagged && (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                        <Flag size={10} /> Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.preview}</p>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.source} → {item.target}</span>
                  <span>{item.words.toLocaleString()} words</span>
                  <span>{item.user}</span>
                  <span>{item.created}</span>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    onClick={() => toast({ title: `Viewing ${item.id}`, description: item.preview })}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => void toggleFlag(item)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors"
                  >
                    <Flag size={14} />
                  </button>
                  <button
                    onClick={() => void deleteItem(item.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={Boolean(playbackUrl)} onOpenChange={(open) => !open && setPlaybackUrl(null)}>
        <DialogContent className="w-[95vw] max-w-5xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Translated Output Preview</DialogTitle>
            <DialogDescription>
              Review the translated/dubbed output for this content item.
            </DialogDescription>
          </DialogHeader>
          {playbackUrl && (
            <div className="max-h-[78vh] overflow-auto">
              <video
                src={playbackUrl}
                controls
                autoPlay
                className="h-auto max-h-[70vh] w-full rounded-lg bg-black object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContent;
