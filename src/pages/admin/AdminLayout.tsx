import { useState, useCallback, useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Search, Sun, Moon, ShieldCheck } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminContent from "@/pages/admin/AdminContent";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSettings from "@/pages/admin/AdminSettings";

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(true);

  /* Force dark mode when entering admin */
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.add("dark");
    setIsDark(true);
    return () => {
      if (!wasDark) root.classList.remove("dark");
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
    setIsDark((d) => !d);
  }, [isDark]);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className={cn(
            "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-6",
            collapsed ? "left-[68px]" : "left-64",
          )}
        >
          {/* Left */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Voxinity Control Centre</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            <button className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Search size={16} />
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell size={16} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>

            <div className="mx-1 h-7 w-px bg-border" />

            <Link
              to="/admin/settings"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">Admin</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Super Admin</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <motion.main
          key="admin-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto p-6 pt-20 lg:p-8 lg:pt-20"
        >
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </motion.main>
      </div>
    </div>
  );
};

export default AdminLayout;
