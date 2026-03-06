import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu, X, Sun, Moon, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const links = [
{ name: "Home", path: "/" },

{ name: "How It Works", path: "/how-it-works" },
{ name: "Extension", path: "/extension" },
{ name: "Pricing", path: "/pricing" },
{ name: "About", path: "/about" },
{ name: "Help", path: "/help" }];


const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{
    id: number;
    title: string;
    body: string;
    is_read: boolean;
    created_at?: string | null;
  } | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{
      id: number;
      title: string;
      body: string;
      is_read: boolean;
      created_at?: string | null;
    }>
  >([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
  };

  const unreadCount = notifications.reduce((count, item) => count + (item.is_read ? 0 : 1), 0);

  const loadNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/notifications/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          setNotifications([]);
          return;
        }
        throw new Error("Failed to load notifications.");
      }
      const payload = (await response.json().catch(() => ({}))) as {
        items?: Array<{
          id: number;
          title: string;
          body: string;
          is_read: boolean;
          created_at?: string | null;
        }>;
      };
      setNotifications(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)),
      );
    } catch {
      /* ignore network failures for read marker */
    }
  };

  const openNotification = async (notification: {
    id: number;
    title: string;
    body: string;
    is_read: boolean;
    created_at?: string | null;
  }) => {
    setSelectedNotification(notification);
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    try {
      await fetch(`${API_BASE}/api/notifications/${notification.id}/click`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore click tracking failures */
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { "x-soft-auth": "1" },
        });
        if (!alive) return;
        if (response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
          setIsAuthenticated(Boolean(payload.ok));
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (!alive) return;
        setIsAuthenticated(false);
      }
    };
    const onAuthChanged = () => {
      void run();
    };
    void run();
    window.addEventListener("vox-auth-changed", onAuthChanged);
    return () => {
      alive = false;
      window.removeEventListener("vox-auth-changed", onAuthChanged);
    };
  }, [API_BASE, location.pathname]);

  useEffect(() => {
    void loadNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${wsProtocol}://${window.location.hostname}:8000/api/ws/user`);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; message?: string; title?: string };
        if (payload.type === "ACCOUNT_SUSPENDED") {
          setIsAuthenticated(false);
          window.dispatchEvent(new Event("vox-auth-changed"));
          toast({
            title: "Account suspended",
            description: payload.message || "Admin suspended you. Contact admin.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
        } else if (payload.type === "ADMIN_NOTIFICATION") {
          void loadNotifications();
          toast({
            title: payload.title || "New notification",
            description: payload.message || "You received a new message from admin.",
          });
        }
      } catch {
        /* ignore malformed events */
      }
    };
    return () => {
      ws.close();
    };
  }, [isAuthenticated, navigate, toast]);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4" aria-label="Main navigation">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" aria-label="Voxinity home">
          
          <span className="font-display text-2xl font-bold">Voxinity</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) =>
          <Link
            key={link.path}
            to={link.path}
            className={`relative px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
            location.pathname === link.path ? "text-primary" : "text-muted-foreground"}`
            }>

              {link.name}
              {location.pathname === link.path &&
            <motion.div
              layoutId="nav-underline"
              className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />

            }
            </Link>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle dark mode">

            <Sun size={18} className="dark:hidden" />
            <Moon size={18} className="hidden dark:block" />
          </button>
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative hidden md:inline-flex"
                aria-label="Notifications"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate("/login");
                  } else {
                    void loadNotifications();
                  }
                }}
              >
                <Bell size={18} />
                {isAuthenticated && unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>Recent admin messages for your account.</SheetDescription>
              </SheetHeader>
              {!isAuthenticated ? (
                <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Sign in to view your notifications.
                </div>
              ) : notifications.length === 0 ? (
                <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                <div className="mt-5 space-y-2 overflow-y-auto pr-1 max-h-[70vh]">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        item.is_read
                          ? "border-border bg-background hover:bg-muted/20"
                          : "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      }`}
                      onClick={() => void openNotification(item)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        {!item.is_read ? (
                          <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </SheetContent>
          </Sheet>
          {isAuthenticated ? (
            <Button asChild variant="outline" size="icon" className="hidden md:inline-flex" aria-label="Profile">
              <Link to="/profile" title="Profile">
                <UserCircle2 size={18} />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/login">Sign In</Link>
            </Button>
          )}
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/demo">Try Now</Link>
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle menu">

            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title || "Notification"}</DialogTitle>
            <DialogDescription>
              {selectedNotification?.created_at
                ? new Date(selectedNotification.created_at).toLocaleString()
                : "Admin message"}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {selectedNotification?.body || ""}
          </p>
        </DialogContent>
      </Dialog>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden border-t border-border md:hidden">

            <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
              {links.map((link) =>
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted ${
              location.pathname === link.path ? "text-primary bg-primary/5" : "text-muted-foreground"}`
              }>

                  {link.name}
                </Link>
            )}
              {isAuthenticated ? (
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    <span className="inline-flex items-center gap-2">
                      <UserCircle2 size={16} />
                      Profile
                    </span>
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
              )}
              <Button asChild size="sm">
                <Link to="/demo" onClick={() => setMobileOpen(false)}>Try Now</Link>
              </Button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

};

export default Navbar;