import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Bell,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
      { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Users", icon: Users, path: "/admin/users" },
      { label: "Subscriptions", icon: CreditCard, path: "/admin/subscriptions" },
      { label: "Content", icon: FileText, path: "/admin/content" },
      { label: "Notifications", icon: Bell, path: "/admin/notifications" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", icon: Settings, path: "/admin/settings" },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar = ({ collapsed, onToggle }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const response = await fetch(`${API_BASE}/api/admin/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to logout.");
      }
      window.dispatchEvent(new Event("vox-auth-changed"));
      toast({ title: "Logged out", description: "Admin session ended successfully." });
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck size={16} className="text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-display text-sm font-bold text-foreground leading-tight">Admin</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Voxinity Control</p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="admin-active"
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <item.icon size={18} className="relative z-10 shrink-0" />
                    {!collapsed && (
                      <span className="relative z-10">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-4 space-y-0.5">
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={18} className="shrink-0" /> : <ChevronLeft size={18} className="shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <NavLink
          to="/"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Globe size={18} className="shrink-0" />
          {!collapsed && <span>Public Site</span>}
        </NavLink>
        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{loggingOut ? "Logging out..." : "Logout"}</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
