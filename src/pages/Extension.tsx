import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import SyntheticHero from "@/components/ui/synthetic-hero";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Chrome, Download, Settings, Check, Monitor, Zap, Globe, Shield, Puzzle,
  Play, Volume2, Captions, ArrowRight, Sparkles, MousePointerClick
} from "lucide-react";
import { Link } from "react-router-dom";

/* ── Tilt card ── */
const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);

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

/* ── Install steps ── */
const installSteps = [
  { icon: Download, title: "Install", desc: "Add the extension from the Chrome Web Store with one click.", num: "01" },
  { icon: Settings, title: "Configure", desc: "Choose your target language and preferred dubbing settings.", num: "02" },
  { icon: Play, title: "Watch", desc: "Open any YouTube video — Voxinity activates automatically.", num: "03" },
];

/* ── Features ── */
const features = [
  { icon: Zap, title: "Real-time Processing", desc: "Sub-50ms latency for natural viewing experience." },
  { icon: Globe, title: "Multi-language", desc: "Sinhala, Tamil, English, and more languages supported." },
  { icon: Captions, title: "Live Subtitles", desc: "Synchronized subtitle overlay directly on the video." },
  { icon: Volume2, title: "AI Dubbing", desc: "Natural-sounding dubbed audio in your chosen language." },
  { icon: Shield, title: "Privacy First", desc: "No data stored — everything processed in real-time." },
  { icon: Puzzle, title: "Lightweight", desc: "Under 2MB, zero impact on browser performance." },
];

/* ── Browser mockup ── */
const BrowserMockup = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="relative mx-auto max-w-4xl"
    >
      {/* Glow behind */}
      <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />

      <div className="glass relative overflow-hidden rounded-2xl border border-border/50">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 sm:gap-3 border-b border-border/50 bg-card/50 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="hidden sm:flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/50" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
            <div className="h-3 w-3 rounded-full bg-green-500/50" />
          </div>
          <div className="flex-1 min-w-0 mx-0 sm:mx-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-muted-foreground truncate">
              <Monitor size={12} className="shrink-0" />
              <span className="truncate">youtube.com/watch?v=lecture-sinhala</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium text-primary">
            <Puzzle size={12} />
            <span className="hidden sm:inline">Voxinity</span>
          </div>
        </div>

        {/* Video area */}
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80"
            alt="YouTube video with Voxinity extension active"
            className="w-full h-48 sm:h-64 md:h-80 object-cover"
            loading="lazy"
          />

          {/* Play button overlay */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30 cursor-pointer"
          >
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={24} className="ml-1 text-white" fill="white" />
            </motion.div>
          </button>

          {/* Subtitle overlay */}
          <motion.div
            className="absolute bottom-4 inset-x-4 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="rounded-lg bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <span className="text-primary font-medium">සිංහල:</span> මෙය AI මගින් ස්වයංක්‍රීයව පරිවර්තනය කරන ලදී
            </div>
          </motion.div>

          {/* Voxinity control panel */}
          <motion.div
            className="absolute top-4 right-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-black/50 p-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Globe size={12} className="text-primary" />
                <span>Sinhala</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Volume2 size={12} className="text-primary" />
                <span>Dubbed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Captions size={12} className="text-primary" />
                <span>Subtitles</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const Extension = () => {
  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <SyntheticHero
        title="Voxinity for YouTube"
        badgeLabel="Extension"
        badgeText="Chrome Web Store"
        subtitle="Get real-time AI dubbing and subtitles directly on YouTube. One click to install, zero configuration needed."
        showInput={false}
      >
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Button size="lg" className="w-full sm:w-auto gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            <Chrome size={18} />
            Add to Chrome — Free
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10">
            <MousePointerClick size={18} />
            Watch Demo
          </Button>
        </div>
      </SyntheticHero>

      {/* Browser Mockup */}
      <section className="py-20 -mt-10">
        <div className="container mx-auto px-4">
          <BrowserMockup />
        </div>
      </section>

      {/* Install Steps */}
      <section className="py-20 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-14 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Get Started in Seconds</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to multilingual YouTube</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid gap-8 md:grid-cols-3"
          >
            {installSteps.map((step, i) => (
              <motion.div key={i} variants={fadeUp}>
                <TiltCard>
                  <GlassCard className="group relative h-full overflow-hidden transition-shadow hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.25)]">
                    {/* Large step number */}
                    <span className="absolute -right-3 -top-4 font-display text-8xl font-black text-primary/[0.06] select-none">
                      {step.num}
                    </span>
                    <div className="relative flex flex-col items-center gap-5 text-center p-2">
                      <motion.div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20"
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <step.icon size={24} />
                      </motion.div>
                      <div>
                        <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </GlassCard>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-14 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Extension Features</h2>
            <p className="mt-3 text-muted-foreground">Everything you need for a seamless multilingual experience</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="group h-full transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.2)] hover:border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <f.icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Permissions & Compatibility */}
      <section className="py-20 border-y border-border bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Permissions</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Access to YouTube pages only",
                    "Audio capture for real-time processing",
                    "Display subtitle overlay on video",
                    "No data collection or tracking",
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Check size={14} className="shrink-0 text-primary" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="h-full">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Monitor size={20} />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Compatibility</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Supported Browsers</p>
                    <div className="flex flex-wrap gap-2">
                      {["Chrome", "Edge", "Brave", "Opera"].map((b) => (
                        <span key={b} className="glass rounded-lg px-3 py-1.5 text-xs font-medium">{b}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Supported Platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {["YouTube", "YouTube Music"].map((p) => (
                        <span key={p} className="glass rounded-lg px-3 py-1.5 text-xs font-medium text-primary">{p}</span>
                      ))}
                      <span className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">
                        More coming soon
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Frequently Asked</h2>
            <p className="mt-3 text-muted-foreground">Common questions about the extension</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="1">
                  <AccordionTrigger className="text-sm font-semibold">Is the extension free?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">Yes, completely free during the research and prototype phase. No hidden costs.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="2">
                  <AccordionTrigger className="text-sm font-semibold">Does it work on all videos?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">It works best on videos with clear speech. Music-heavy or very noisy content may have lower accuracy.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="3">
                  <AccordionTrigger className="text-sm font-semibold">Is my data stored anywhere?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">No. Audio is processed in real-time and never stored. We prioritize your privacy above all else.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="4">
                  <AccordionTrigger className="text-sm font-semibold">Will Firefox be supported?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">Firefox support is planned for a future release. Currently all Chromium-based browsers are supported.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="5" className="border-b-0">
                  <AccordionTrigger className="text-sm font-semibold">How does it affect video performance?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">The extension is lightweight (under 2MB) and uses efficient streaming. It has minimal impact on playback performance.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Sparkles size={32} className="mx-auto mb-4 text-primary" />
            <h2 className="font-display text-3xl font-bold">Ready to break language barriers?</h2>
            <p className="mt-3 text-muted-foreground">Install now and start watching YouTube in any language.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2">
                <Chrome size={16} /> Add to Chrome
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link to="/demo">
                  Try Demo First <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Extension;
