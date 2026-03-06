import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Download,
  ChevronRight,
  Sparkles,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    name: "Hobby",
    price: 0,
    period: "/ month",
    description: "For personal projects and exploration",
    features: ["500 translations / month", "5 languages", "Community support", "Basic analytics"],
    current: false,
    cta: "Downgrade",
    icon: Clock,
  },
  {
    name: "Pro",
    price: 20,
    period: "/ month",
    description: "For professionals and growing teams",
    features: [
      "Unlimited translations",
      "50+ languages",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Custom glossaries",
    ],
    current: true,
    cta: "Current Plan",
    icon: Zap,
    highlight: true,
  },
  {
    name: "Business",
    price: 80,
    period: "/ month",
    description: "For teams and enterprise workflows",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "SSO / SAML",
      "Dedicated support",
      "SLA guarantee",
      "Custom integrations",
    ],
    current: false,
    cta: "Upgrade",
    icon: Building2,
  },
];

const invoices = [
  { id: "INV-2024-06", date: "Jun 1, 2024", amount: "$20.00", status: "Paid" },
  { id: "INV-2024-05", date: "May 1, 2024", amount: "$20.00", status: "Paid" },
  { id: "INV-2024-04", date: "Apr 1, 2024", amount: "$20.00", status: "Paid" },
  { id: "INV-2024-03", date: "Mar 1, 2024", amount: "$20.00", status: "Paid" },
  { id: "INV-2024-02", date: "Feb 1, 2024", amount: "$20.00", status: "Paid" },
];

const PaymentsPage = () => {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleAction = (planName: string, cta: string) => {
    if (cta === "Current Plan") return;
    toast({
      title: `${cta} to ${planName}`,
      description: "Redirecting to billing portal…",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and payment history</p>
      </motion.div>

      {/* Current plan banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Pro Plan — Active</p>
            <p className="text-xs text-muted-foreground">Renews on July 1, 2024 · $20.00/mo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Active
          </span>
          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => toast({ title: "Opening billing portal…" })}>
            Manage
          </Button>
        </div>
      </motion.div>

      {/* Billing toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 w-fit"
      >
        {(["monthly", "yearly"] as const).map((cycle) => (
          <button
            key={cycle}
            onClick={() => setBillingCycle(cycle)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              billingCycle === cycle
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cycle}
            {cycle === "yearly" && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-semibold">
                −20%
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const price = billingCycle === "yearly" ? Math.round(plan.price * 0.8) : plan.price;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow ${
                plan.highlight
                  ? "border-primary/40 bg-card ring-1 ring-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow">
                    <Sparkles size={11} /> Current Plan
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-4 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${plan.highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <plan.icon size={16} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-1">
                <span className="text-3xl font-bold text-foreground">${price}</span>
                <span className="ml-1 text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">{plan.description}</p>

              {/* Features */}
              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                    <Check size={13} className="shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleAction(plan.name, plan.cta)}
                variant={plan.highlight ? "default" : "outline"}
                size="sm"
                className="w-full rounded-xl text-xs"
                disabled={plan.current}
              >
                {plan.cta}
                {plan.cta !== "Current Plan" && <ChevronRight size={14} />}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Payment method */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">Payment Method</h3>
        <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold text-foreground tracking-wider">
              VISA
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expires 12 / 26</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8"
            onClick={() => toast({ title: "Opening payment settings…" })}>
            Update
          </Button>
        </div>

        {/* Notice */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Your card is charged automatically on the renewal date. You can cancel or change your plan anytime before that.
          </p>
        </div>
      </motion.div>

      {/* Invoice history */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invoice History</h3>
            <p className="text-xs text-muted-foreground">Past receipts for your records</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5">
            <Download size={13} /> Export All
          </Button>
        </div>

        <div className="divide-y divide-border">
          {invoices.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center justify-between px-6 py-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <CreditCard size={14} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.id}</p>
                  <p className="text-xs text-muted-foreground">{inv.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground">{inv.amount}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  {inv.status}
                </span>
                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-foreground">
                  <Download size={13} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentsPage;
