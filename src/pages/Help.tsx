import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import SyntheticHero from "@/components/ui/synthetic-hero";
import GlassCard from "@/components/GlassCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Check, AlertCircle, HelpCircle, MessageSquare, Activity, Search,
  Send, Mail, User, FileText, ArrowRight, Shield, Zap, Globe, Sparkles
} from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const faqs = [
  { q: "What languages are supported?", a: "Currently Sinhala, Tamil, and English. We're working on adding more South Asian languages.", icon: Globe },
  { q: "Is Voxinity free to use?", a: "Yes, during the research and prototype phase, all features are free to use.", icon: Sparkles },
  { q: "How accurate is the translation?", a: "Translation quality varies by language pair. English to Sinhala/Tamil achieves competitive BLEU scores for a prototype system.", icon: Zap },
  { q: "Can I use Voxinity for live streams?", a: "Live stream support is planned but not yet available. Currently, we support pre-recorded videos and YouTube content.", icon: Activity },
  { q: "Does Voxinity store my videos?", a: "No. We process audio in real-time and do not permanently store any user content.", icon: Shield },
  { q: "What is the Sign Avatar feature?", a: "It's an experimental prototype that generates sign language animations for translated content, aimed at improving accessibility for the deaf community.", icon: HelpCircle },
];

const services = [
  { name: "ASR Engine", status: "Operational", uptime: "99.9%" },
  { name: "Translation API", status: "Operational", uptime: "99.7%" },
  { name: "TTS Service", status: "Operational", uptime: "99.5%" },
  { name: "Sign Avatar (Beta)", status: "Degraded", uptime: "94.2%" },
];

/* ── Tilt card ── */
const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`perspective-[800px] ${className}`}
    >
      {children}
    </motion.div>
  );
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Help = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const filteredFaqs = searchQuery
    ? faqs.filter((f) =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: "Message Sent", description: "We'll get back to you soon. Thank you!" });
      setForm({ name: "", email: "", message: "" });
    }, 1200);
  };

  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <SyntheticHero
        title="How Can We Help?"
        badgeLabel="Support"
        badgeText="Help Center"
        subtitle="Find answers to common questions, check system status, or reach out to our team directly."
        showInput={false}
      >
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Button
            size="lg"
            className="gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            onClick={() => document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <HelpCircle size={18} />
            Browse FAQ
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <MessageSquare size={18} />
            Contact Us
          </Button>
        </div>
      </SyntheticHero>

      {/* FAQ Section */}
      <section id="faq-section" className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            className="mb-10 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-3 text-muted-foreground">Quick answers to the most common questions</p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="glass relative flex items-center gap-3 rounded-2xl px-5 py-3 transition-all focus-within:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.2)]">
              <Search size={18} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>

          {/* FAQ accordion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard initial={false}>
              <Accordion type="single" collapsible className="w-full">
                <AnimatePresence mode="popLayout">
                  {filteredFaqs.map((faq, i) => (
                    <motion.div
                      key={faq.q}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <AccordionItem value={String(i)} className={i === filteredFaqs.length - 1 ? "border-b-0" : ""}>
                        <AccordionTrigger className="text-sm font-semibold gap-3">
                          <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <faq.icon size={14} />
                            </span>
                            {faq.q}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pl-11">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredFaqs.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No questions match your search. Try a different keyword or <button onClick={() => setSearchQuery("")} className="text-primary underline cursor-pointer">clear the search</button>.
                  </div>
                )}
              </Accordion>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* System Status */}
      <section className="py-20 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">System Status</h2>
            <p className="mt-3 text-muted-foreground">Real-time health of all Voxinity services</p>
          </motion.div>

          {/* Overall status banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="glass flex items-center justify-between rounded-2xl px-6 py-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="h-3 w-3 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-sm font-semibold">All Core Systems Operational</span>
              </div>
              <span className="text-xs text-muted-foreground">Updated just now</span>
            </div>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {services.map((service) => (
              <motion.div key={service.name} variants={fadeUp}>
                <TiltCard>
                  <GlassCard className="group h-full transition-shadow hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.2)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${service.status === "Operational" ? "bg-primary" : "bg-yellow-500"}`} />
                        <span className="text-sm font-medium">{service.name}</span>
                      </div>
                      <StatusBadge variant={service.status === "Operational" ? "success" : "warning"}>
                        {service.status === "Operational" ? <Check size={10} /> : <AlertCircle size={10} />}
                        {service.status}
                      </StatusBadge>
                    </div>
                    {/* Uptime bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Uptime (30d)</span>
                        <span className="font-medium text-foreground">{service.uptime}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full rounded-full ${service.status === "Operational" ? "bg-primary" : "bg-yellow-500"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: service.uptime }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Get in Touch</h2>
            <p className="mt-3 text-muted-foreground">Can't find your answer? Send us a message and we'll respond within 24 hours.</p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Contact form */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard initial={false} className="h-full">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <User size={14} className="text-primary" />
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="bg-background/50"
                    />
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-xs text-destructive flex items-center gap-1"
                      >
                        <AlertCircle size={12} /> {errors.name}
                      </motion.p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Mail size={14} className="text-primary" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="bg-background/50"
                    />
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-xs text-destructive flex items-center gap-1"
                      >
                        <AlertCircle size={12} /> {errors.email}
                      </motion.p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="message" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-primary" />
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      className="bg-background/50 resize-none"
                    />
                    {errors.message && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 text-xs text-destructive flex items-center gap-1"
                      >
                        <AlertCircle size={12} /> {errors.message}
                      </motion.p>
                    )}
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={sending}>
                    {sending ? (
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Send size={16} />
                    )}
                    {sending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </GlassCard>
            </motion.div>

            {/* Quick links sidebar */}
            <motion.div
              className="lg:col-span-2 space-y-4"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {[
                { icon: Mail, title: "Email Us", desc: "support@voxinity.com", sub: "Typical response: < 24 hours" },
                { icon: MessageSquare, title: "Community", desc: "Join our Discord server", sub: "Chat with other users" },
                { icon: FileText, title: "Documentation", desc: "Read our API docs", sub: "Technical guides & examples" },
              ].map((item, i) => (
                <TiltCard key={i}>
                  <GlassCard
                    initial={false}
                    className="group cursor-pointer transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.2)] hover:border-primary/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <item.icon size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{item.title}</h3>
                          <ArrowRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                        <p className="mt-0.5 text-sm text-primary">{item.desc}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Help;
