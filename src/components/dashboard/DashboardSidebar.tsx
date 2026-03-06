import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  BarChart3,
  Activity,
  Zap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
  { label: "Activity", icon: Activity, path: "/dashboard/activity" },
  { label: "Quick Actions", icon: Zap, path: "/dashboard/actions" },
  { label: "Profile", icon: User, path: "/dashboard/profile" },
  { label: "Payments", icon: CreditCard, path: "/dashboard/payments" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const DashboardSidebar = ({ collapsed, onToggle }: Props) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-center border-b border-border px-4">
        <motion.span
          key={collapsed ? "collapsed" : "expanded"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-lg font-bold text-foreground"
        >
          {collapsed ? "V" : "Voxinity"}
        </motion.span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={20} className="relative z-10 shrink-0" />
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={20} className="shrink-0" /> : <ChevronLeft size={20} className="shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
