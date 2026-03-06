import { motion, useMotionValue, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Shield, Users, Eye, Globe, Zap, Target, Heart, ArrowRight, Code2, Brain, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SyntheticHero from "@/components/ui/synthetic-hero";

/* ── Animated counter ── */
const Counter = ({ target, suffix = "", label }: { target: number; suffix?: string; label: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <span className="font-display text-3xl font-bold text-primary sm:text-4xl md:text-5xl">
        {count}{suffix}
      </span>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

/* ── Tilt card on hover ── */
const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`perspective-[800px] ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* ── Values data ── */
const values = [
  { icon: Globe, title: "Accessibility First", desc: "Language should never be a barrier to knowledge and entertainment." },
  { icon: Shield, title: "Privacy by Design", desc: "No permanent storage — all processing is real-time and ephemeral." },
  { icon: Heart, title: "Open Research", desc: "Academic-driven innovation for low-resource language communities." },
  { icon: Zap, title: "Real-time Focus", desc: "Sub-second latency for natural, uninterrupted viewing experience." },
];

/* ── Timeline data ── */
const timeline = [
  { phase: "Research", desc: "Speech recognition & NLP for Sinhala/Tamil", status: "done" },
  { phase: "Prototype", desc: "End-to-end pipeline with browser extension", status: "done" },
  { phase: "Testing", desc: "User studies & latency optimization", status: "active" },
  { phase: "Release", desc: "Public beta & community feedback", status: "upcoming" },
];

/* ── Tech stack ── */
const techStack = [
  { icon: Brain, label: "AI / NLP" },
  { icon: Headphones, label: "Speech Processing" },
  { icon: Code2, label: "Modern Web" },
  { icon: Target, label: "Low-Resource Focus" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const About = () => {
  return (
    <main className="overflow-hidden">
      {/* ── Hero — same shader animation as Home ── */}
      <SyntheticHero
        title="About Voxinity"
        badgeLabel="Our Story"
        badgeText="Research & Innovation"
        subtitle="Breaking language barriers through AI-powered real-time video dubbing — with a special focus on low-resource languages like Sinhala and Tamil."
        showInput={false}
      />

      {/* ── Stats Counter ── */}
      <section className="border-y border-border py-14 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Counter target={3} suffix="+" label="Languages Supported" />
            <Counter target={50} suffix="ms" label="Average Latency" />
            <Counter target={95} suffix="%" label="ASR Accuracy" />
            <Counter target={24} suffix="/7" label="Real-time Processing" />
          </div>
        </div>
      </section>

      {/* ── Mission — Full width glass banner ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className="relative overflow-hidden p-8 md:p-12">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-[60px]" />
              <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Eye size={28} />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="font-display text-2xl font-bold md:text-3xl">Our Mission</h2>
                  <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
                    Voxinity aims to make video content universally accessible by providing real-time multilingual 
                    dubbing and subtitle generation. We believe everyone deserves access to knowledge regardless 
                    of the language they speak. Our research focuses on underrepresented languages that mainstream 
                    tools often overlook.
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ── Values — interactive tilt cards ── */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <motion.h2
            className="mb-14 text-center font-display text-3xl font-bold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            What We Stand For
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {values.map((v) => (
              <motion.div key={v.title} variants={fadeUp}>
                <TiltCard>
                  <GlassCard className="group h-full cursor-default transition-shadow hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.25)]">
                    <div className="flex flex-col items-center text-center gap-4 p-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <v.icon size={22} />
                      </div>
                      <h3 className="font-display text-lg font-semibold">{v.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                    </div>
                  </GlassCard>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            className="mb-14 text-center font-display text-3xl font-bold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Project Timeline
          </motion.h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border md:left-1/2 md:-translate-x-px" />

            {timeline.map((item, i) => (
              <motion.div
                key={item.phase}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative mb-10 flex items-start gap-6 md:gap-0 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-6 top-1.5 z-10 md:left-1/2 md:-translate-x-1/2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full border-2 ${
                      item.status === "done"
                        ? "border-primary bg-primary"
                        : item.status === "active"
                        ? "border-primary bg-background animate-pulse"
                        : "border-muted-foreground/30 bg-background"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className={`ml-14 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <GlassCard className="inline-block">
                    <p className="font-display text-sm font-bold text-primary">{item.phase}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    {item.status === "active" && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> In Progress
                      </span>
                    )}
                  </GlassCard>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <motion.h2
            className="mb-14 text-center font-display text-3xl font-bold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Built With
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {techStack.map((tech) => (
              <motion.div key={tech.label} variants={fadeUp}>
                <div className="glass flex items-center gap-3 rounded-2xl px-6 py-4 transition-all hover:scale-105 hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.2)]">
                  <tech.icon size={20} className="text-primary" />
                  <span className="font-display text-sm font-semibold">{tech.label}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.h2
            className="mb-14 text-center font-display text-3xl font-bold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            The Team
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 sm:grid-cols-2"
          >
            <TiltCard>
              <GlassCard className="group h-full transition-shadow hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.2)]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users size={28} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">Researcher & Developer</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Built with passion for language technology and accessibility, combining expertise in 
                      speech processing, NLP, and modern web development.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </TiltCard>

            <TiltCard>
              <GlassCard className="group h-full transition-shadow hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.2)]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Target size={28} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">Academic Supervision</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Conducted under academic supervision ensuring rigorous methodology 
                      and ethical considerations in AI development.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border py-20 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl font-bold">Want to see it in action?</h2>
            <p className="mt-3 text-muted-foreground">Experience real-time multilingual dubbing in your browser.</p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/demo">
                Try Now <ArrowRight size={16} />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default About;
