import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const planColors: Record<string, string> = {
  Hobby: "bg-muted text-muted-foreground",
  Pro: "bg-primary/15 text-primary",
  Business: "bg-violet-400/15 text-violet-400",
};

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  inactive: "bg-muted text-muted-foreground",
  banned: "bg-destructive/15 text-destructive",
};

const AdminUsers = () => {
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [search, setSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [updatingStatusFor, setUpdatingStatusFor] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      plan: string;
      status: string;
      joined: string;
      translations: number;
      preferred_language: string;
    }>
  >([]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        plan: selectedPlan,
        status: selectedStatus,
      });
      const response = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        users?: Array<{
          id: string;
          name: string;
          email: string;
          plan: string;
          status: string;
          joined: string;
          translations: number;
          preferred_language: string;
        }>;
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || "Failed to fetch users.");
      }
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch (error) {
      setUsers([]);
      toast({
        title: "Users fetch failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [search, selectedPlan, selectedStatus]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    const banned = users.filter((u) => u.status === "banned").length;
    return { total, active, inactive, banned };
  }, [users]);

  const runUserAction = async (
    userId: string,
    actionLabel: "Activated" | "Suspended" | "Deleted",
    endpoint: string,
    method: "POST" | "DELETE",
  ) => {
    try {
      if (method !== "DELETE") {
        setUpdatingStatusFor(userId);
      }
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Action failed.");
      }
      if (method === "DELETE") {
        setDeletingUser(null);
      }
      toast({ title: `${actionLabel} user`, description: "Database updated." });
      await loadUsers();
    } catch (error) {
      toast({
        title: `${actionLabel} failed`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
    finally {
      setUpdatingStatusFor(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">Manage accounts, plans, and access</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Users", value: stats.total.toLocaleString(), color: "text-foreground" },
          { label: "Active", value: stats.active.toLocaleString(), color: "text-primary" },
          { label: "Inactive", value: stats.inactive.toLocaleString(), color: "text-muted-foreground" },
          { label: "Banned", value: stats.banned.toLocaleString(), color: "text-destructive" },
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
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {["All", "Hobby", "Pro", "Business"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPlan === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {["All", "active", "inactive", "banned"].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedStatus === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="ml-auto rounded-xl h-9 gap-1.5 text-xs">
          <Download size={13} /> Export
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="rounded-2xl border border-border bg-card p-4 md:p-5"
      >
        <div className="hidden rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[minmax(220px,2fr)_110px_110px_120px_110px_110px_56px] md:gap-3">
          <span>User</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Joined</span>
          <span>Translations</span>
          <span>Preferred</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="rounded-xl border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
              No users found for current filters.
            </div>
          ) : (
            users.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-background px-4 py-3.5 transition-colors hover:bg-muted/20"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(220px,2fr)_110px_110px_120px_110px_110px_56px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs md:text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${planColors[u.plan]}`}>
                      {u.plan}
                    </span>
                  </div>

                  <div className="text-xs md:text-sm">
                    <Select
                      value={u.status === "active" ? "active" : "suspend"}
                      onValueChange={(value) => {
                        if (value === "active" && u.status !== "active") {
                          void runUserAction(u.id, "Activated", `/api/admin/users/${u.id}/activate`, "POST");
                        } else if (value === "suspend" && u.status === "active") {
                          void runUserAction(u.id, "Suspended", `/api/admin/users/${u.id}/suspend`, "POST");
                        }
                      }}
                      disabled={updatingStatusFor === u.id}
                    >
                      <SelectTrigger
                        className={`h-7 w-[110px] rounded-full border-0 px-2.5 py-0 text-[11px] font-medium capitalize ${
                          u.status === "active" ? statusColors.active : statusColors.inactive
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspend">Suspend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground md:text-sm">{u.joined}</div>
                  <div className="text-xs font-semibold text-foreground md:text-sm">{u.translations.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground md:text-sm">{u.preferred_language || "-"}</div>

                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setDeletingUser({ id: u.id, name: u.name })}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${u.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 md:px-5 md:py-3.5">
          <p className="text-xs text-muted-foreground">Showing {users.length} users</p>
          <span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
            Page 1
          </span>
        </div>
      </motion.div>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser
                ? `This will permanently remove ${deletingUser.name}'s account and sessions. This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deletingUser) return;
                void runUserAction(
                  deletingUser.id,
                  "Deleted",
                  `/api/admin/users/${deletingUser.id}`,
                  "DELETE",
                );
              }}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
