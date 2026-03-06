import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Moon, Bell, Search, User } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import ProfileCard from "@/components/dashboard/ProfileCard";
import StatsCards from "@/components/dashboard/StatsCards";
import UsageChart from "@/components/dashboard/UsageChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import AnalyticsPage from "@/pages/dashboard/AnalyticsPage";
import ActivityPage from "@/pages/dashboard/ActivityPage";
import ActionsPage from "@/pages/dashboard/ActionsPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import PaymentsPage from "@/pages/dashboard/PaymentsPage";

/* Overview content (default dashboard view) */
const OverviewContent = () => (
  <div className="space-y-6">
    <StatsCards />
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3"><UsageChart /></div>
      <div className="lg:col-span-2"><ActivityFeed /></div>
    </div>
    <QuickActions />
  </div>
);

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);

  /* Start in light mode */
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    setIsDark(false);
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
    setIsDark(!isDark);
  }, [isDark]);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Dashboard Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-6 lg:px-8">
          {/* Left side — title & greeting */}
          <div>
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Welcome back, John 👋</p>
          </div>

          {/* Right side — actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Search size={18} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <button className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>

            {/* Divider */}
            <div className="mx-1 h-8 w-px bg-border" />

            {/* Profile */}
            <Link
              to="/dashboard/profile"
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                <User size={16} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">John Doe</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Pro Plan</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Routes>
            <Route index element={<OverviewContent />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="actions" element={<ActionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
