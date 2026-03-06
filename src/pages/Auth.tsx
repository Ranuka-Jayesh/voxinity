import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ApiErrorDetail =
  | string
  | { msg?: string; detail?: string; message?: string }
  | Array<{ loc?: Array<string | number>; msg?: string; type?: string }>;

const extractApiErrorMessage = (detail: ApiErrorDetail | undefined, fallback: string) => {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (!first) return fallback;
    const field = first.loc && first.loc.length > 0 ? String(first.loc[first.loc.length - 1]) : "field";
    const msg = first.msg || "Invalid value";
    return `${field}: ${msg}`;
  }
  if (typeof detail === "object") {
    return detail.msg || detail.detail || detail.message || fallback;
  }
  return fallback;
};

const Auth = () => {
  const preferredLanguageOptions = [
    { value: "English", label: "English" },
    { value: "Sinhala", label: "Sinhala" },
    { value: "Tamil", label: "Tamil" },
    { value: "Japanese", label: "Japanese" },
    { value: "Korean", label: "Korean" },
  ];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  /* form fields */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("English");

  const tryAdminLogin = async (loginEmail: string, loginPassword: string) => {
    const adminResponse = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    const adminJson = (await adminResponse.json().catch(() => ({}))) as { detail?: ApiErrorDetail };
    if (!adminResponse.ok) {
      throw new Error(extractApiErrorMessage(adminJson.detail, "Authentication failed."));
    }
    return true;
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("mode") === "signup") {
      setMode("signup");
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || mode === "signup" && !name) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim(), password }
          : {
              email: email.trim(),
              password,
              full_name: name.trim(),
              preferred_language: preferredLanguage,
            };
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { detail?: ApiErrorDetail };
      let loggedInAsAdmin = false;
      if (!response.ok) {
        if (mode === "login") {
          const authError = extractApiErrorMessage(data.detail, "Authentication failed.");
          const canTryAdminFallback =
            response.status === 401 && authError.toLowerCase().includes("invalid credentials");
          if (canTryAdminFallback) {
            // Fallback: admin credentials are stored in separate admin_users table.
            loggedInAsAdmin = await tryAdminLogin(email.trim(), password);
          } else {
            throw new Error(authError);
          }
        } else {
          throw new Error(extractApiErrorMessage(data.detail, "Authentication failed."));
        }
      }
      if (mode === "signup") {
        // Auto-login immediately after successful registration.
        const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const loginJson = (await loginResponse.json()) as { detail?: ApiErrorDetail };
        if (!loginResponse.ok) {
          throw new Error(
            extractApiErrorMessage(loginJson.detail, "Account created, but auto-login failed."),
          );
        }
      }
      setLoading(false);
      toast({
        title: mode === "login" ? "Welcome back!" : "Account created!",
        description: mode === "login" ?
        "You've been logged in successfully." :
        "Your account has been created and logged in."
      });
      window.dispatchEvent(new Event("vox-auth-changed"));
      if (mode === "login") {
        navigate(loggedInAsAdmin ? "/admin" : "/profile");
      } else {
        setMode("login");
        setPassword("");
        navigate("/", { replace: true });
      }
    } catch (error) {
      setLoading(false);
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLogin = mode === "login";

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />

        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md">

        {/* card */}
        <div className="glass rounded-3xl p-8 sm:p-10">
          {/* logo */}
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            
            <span className="font-display text-2xl font-bold">Voxinity</span>
          </Link>

          {/* tab switcher */}
          <div className="relative mb-8 flex rounded-xl bg-muted/50 p-1">
            {(["login", "signup"] as const).map((tab) =>
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`relative z-10 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`
              }>

                {tab === "login" ? "Sign In" : "Sign Up"}
              </button>
            )}
            <motion.div
              layoutId="auth-tab"
              className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm"
              style={{ width: "calc(50% - 4px)" }}
              animate={{ left: isLogin ? 4 : "calc(50% + 0px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }} />

          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin &&
              <motion.div
                key="name"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden">

                  <div className="space-y-1.5 pb-1">
                    <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                      id="name"
                      placeholder="John Doe"
                      className="rounded-xl py-5 pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)} />

                    </div>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
            {!isLogin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Preferred Language
                </Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {preferredLanguageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-xl py-5 pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} />

              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                {isLogin &&
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                }
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="rounded-xl py-5 pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}>

                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 rounded-xl py-5 mt-2"
              disabled={loading}>

              {loading ?
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} /> :


              <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              }
            </Button>
          </form>

          {/* bottom text */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="font-medium text-primary hover:underline">

              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* terms */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          By continuing, you agree to our{" "}
          <Link to="#" className="underline hover:text-muted-foreground">Terms of Service</Link>{" "}
          and{" "}
          <Link to="#" className="underline hover:text-muted-foreground">Privacy Policy</Link>.
        </p>
      </motion.div>
    </main>);

};

export default Auth;