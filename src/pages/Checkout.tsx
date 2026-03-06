import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const detectCardBrand = (digits: string): "visa" | "mastercard" | "unknown" => {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  return "unknown";
};

const formatCardNumber = (value: string) =>
  onlyDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [country, setCountry] = useState("Sri Lanka");

  const planCode = (params.get("plan") || "pro").toLowerCase();
  const interval = (params.get("interval") || "month").toLowerCase();

  const catalog = useMemo(
    () => ({
      pro: { name: "Pro", monthly: 20, yearly: 16, trialDays: 14 },
      business: { name: "Business", monthly: 80, yearly: 64, trialDays: 0 },
      hobby: { name: "Hobby", monthly: 0, yearly: 0, trialDays: 0 },
    }),
    [],
  );

  const selectedPlan = catalog[planCode as keyof typeof catalog] ?? catalog.pro;
  const selectedInterval = interval === "year" ? "year" : "month";
  const price = selectedInterval === "year" ? selectedPlan.yearly : selectedPlan.monthly;
  const cardDigits = onlyDigits(cardNumber);
  const cardBrand = detectCardBrand(cardDigits);
  const cardIsComplete = cardDigits.length === 16;
  const cardLooksValid = cardBrand !== "unknown" && cardIsComplete;

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { "x-soft-auth": "1" },
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: { email?: string | null; full_name?: string | null } | null;
        };
        if (!alive) return;
        if (!payload.ok) {
          navigate("/login?mode=signup", { replace: true });
          return;
        }
        setEmail(payload.user?.email || "");
        setCardHolder(payload.user?.full_name || "");
      } catch {
        if (!alive) return;
        navigate("/login?mode=signup", { replace: true });
      } finally {
        if (alive) setCheckingAuth(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [API_BASE, navigate]);

  const handleCheckout = async () => {
    if (!cardHolder.trim() || !cardNumber.trim() || !country.trim()) {
      toast({
        title: "Missing details",
        description: "Fill card holder, card number, and country.",
        variant: "destructive",
      });
      return;
    }
    if (!cardIsComplete || !cardLooksValid || cardBrand === "unknown") {
      toast({
        title: "Invalid card number",
        description: "Enter a valid Visa or Mastercard number.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE}/api/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_code: planCode,
          billing_interval: selectedInterval,
          card_holder: cardHolder.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || "Checkout failed.");
      }
      toast({
        title: "Subscription activated",
        description:
          selectedPlan.trialDays > 0
            ? `${selectedPlan.name} trial started successfully.`
            : `${selectedPlan.name} subscription activated.`,
      });
      window.dispatchEvent(new Event("vox-auth-changed"));
      navigate("/profile", { replace: true });
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
        <div className="glass w-full max-w-xl rounded-2xl p-6 text-sm text-muted-foreground">Loading checkout...</div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <p className="text-xs font-semibold tracking-wide text-primary">ORDER SUMMARY</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{selectedPlan.name} Plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedPlan.trialDays > 0
              ? `${selectedPlan.trialDays}-day trial, then billed automatically.`
              : "Subscription starts immediately after checkout."}
          </p>
          <div className="mt-6 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing</span>
              <span className="font-medium">{selectedInterval === "year" ? "Yearly" : "Monthly"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">${price.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" />
            Secure checkout. Subscription will be saved to your account.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <div className="mb-5 flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Checkout</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Card Holder</Label>
              <Input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Full name on card"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Card Number</Label>
              <div className="relative">
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  maxLength={19}
                  className={cardBrand !== "unknown" ? "pr-14" : undefined}
                />
                {cardBrand !== "unknown" && (
                  <img
                    src={cardBrand === "visa" ? "/visa.png" : "/master.png"}
                    alt={cardBrand === "visa" ? "Visa" : "Mastercard"}
                    className="pointer-events-none absolute right-3 top-1/2 h-6 w-auto -translate-y-1/2 object-contain"
                  />
                )}
              </div>
              {cardNumber.length > 0 && !cardLooksValid && (
                <p className="text-xs text-destructive">Please enter a valid Visa or Mastercard number.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={() => void handleCheckout()} disabled={submitting}>
            {submitting ? "Processing..." : selectedPlan.trialDays > 0 ? "Start Pro Trial" : `Pay $${price.toFixed(2)}`}
          </Button>
        </motion.div>
      </div>
    </main>
  );
};

export default Checkout;
