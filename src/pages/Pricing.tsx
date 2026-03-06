import { useState } from "react";
import { Zap as ZapIcon, Tv, ShieldCheck, Sparkles as SparklesIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/GlassCard";
import { Check, X, ArrowRight, Zap, Crown, Building2, Sparkles } from "lucide-react";

const plans = [
  {
    id: "hobby",
    name: "Hobby",
    icon: Zap,
    description: "For personal projects and exploration",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    features: [
      { text: "500 translations / month", included: true },
      { text: "5 languages", included: true },
      { text: "Community support", included: true },
      { text: "Basic analytics", included: true },
      { text: "Team workspaces", included: false },
      { text: "SSO / SAML", included: false },
    ],
    cta: "Get Started Free",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    description: "For professionals and growing teams",
    monthlyPrice: 20,
    yearlyPrice: 16,
    badge: "Most Popular",
    features: [
      { text: "Unlimited translations", included: true },
      { text: "50+ languages", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Team workspaces", included: false },
      { text: "SSO / SAML", included: false },
    ],
    cta: "Start Pro Trial",
    ctaVariant: "default" as const,
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    icon: Building2,
    description: "For teams and enterprise workflows",
    monthlyPrice: 80,
    yearlyPrice: 64,
    badge: null,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Team workspaces", included: true },
      { text: "SSO / SAML", included: true },
      { text: "Dedicated support", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Custom integrations", included: true },
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes, upgrade or downgrade at any time. Changes take effect on your next billing cycle.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Absolutely — Pro comes with a 14-day free trial, no credit card required.",
  },
  {
    q: "What languages are supported?",
    a: "We specialize in Sinhala and Tamil, with English, Hindi, and Japanese also supported. More languages coming soon.",
  },
  {
    q: "How does voice cloning work?",
    a: "Upload a 30-second voice sample and our AI will match the speaker's tone, pitch, and cadence in the dubbed output.",
  },
];

const Pricing = () => {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="pb-20">
      {/* Header */}
      <section className="pt-20 pb-10 sm:pt-28 sm:pb-14">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles size={12} /> Simple Pricing
            </Badge>
            <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              Plans that scale with you
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <span className={`text-sm font-medium transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
                yearly ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              aria-label="Toggle yearly billing"
            >
              <motion.div
                className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-primary-foreground shadow-md"
                animate={{ x: yearly ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {yearly && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
              >
                Save 20%
              </motion.span>
            )}
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-3 lg:gap-8 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative"
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="shadow-lg">{plan.badge}</Badge>
                  </div>
                )}
                <div
                  className={`glass rounded-2xl p-6 sm:p-8 h-full flex flex-col transition-shadow duration-300 ${
                    plan.highlighted
                      ? "ring-2 ring-primary shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]"
                      : "hover:shadow-lg"
                  }`}
                >
                  {/* Plan Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <plan.icon size={18} />
                      </div>
                      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={yearly ? "yearly" : "monthly"}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-baseline gap-1"
                      >
                        <span className="font-display text-4xl font-bold">
                          ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-sm text-muted-foreground">/ month</span>
                        )}
                      </motion.div>
                    </AnimatePresence>
                    {yearly && plan.monthlyPrice > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Billed ${(yearly ? plan.yearlyPrice : plan.monthlyPrice) * 12}/year
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    asChild
                    variant={plan.ctaVariant}
                    className={`w-full mb-6 ${plan.highlighted ? "shadow-md" : ""}`}
                  >
                    <Link to={plan.id === "pro" ? "/checkout?plan=pro&interval=month" : "/demo"}>
                      {plan.cta} <ArrowRight size={14} />
                    </Link>
                  </Button>

                  {/* Features */}
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f, fi) => (
                      <motion.li
                        key={fi}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 + fi * 0.03, duration: 0.3 }}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        {f.included ? (
                          <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <X size={16} className="mt-0.5 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                          {f.text}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Highlight */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <GlassCard className="text-center py-10 sm:py-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              All plans include
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { text: "Real-time processing", icon: <ZapIcon size={20} className="text-primary" /> },
                { text: "YouTube integration", icon: <Tv size={20} className="text-primary" /> },
                { text: "Secure & private", icon: <ShieldCheck size={20} className="text-primary" /> },
                { text: "No watermarks", icon: <SparklesIcon size={20} className="text-primary" /> },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex flex-col items-center gap-2 rounded-xl bg-background/50 p-5"
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="glass w-full rounded-xl px-5 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-sm">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 text-muted-foreground text-lg"
                    >
                      +
                    </motion.span>
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden text-sm text-muted-foreground pt-2"
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="container mx-auto px-4 text-center">
          <GlassCard className="py-10 sm:py-14">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ready to break language barriers?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Start with the free plan and upgrade anytime as your needs grow.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link to="/demo">
                  Try Free <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/help">Talk to Us</Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>
    </main>
  );
};

export default Pricing;
