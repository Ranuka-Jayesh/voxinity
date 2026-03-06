import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import SyntheticHero from "@/components/ui/synthetic-hero";
import GlassCard from "@/components/GlassCard";
import {
  AudioLines, Mic, Languages, Volume2, Captions,
  ChevronRight, ArrowRight, CheckCircle2, Zap, Clock, Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type LucideIcon } from "lucide-react";

/* ── Step data ── */
interface Step {
  icon: LucideIcon;
  title: string;
  shortTitle: string;
  description: string;
  details: string[];
  color: string;
}

const steps: Step[] = [
  {
    icon: AudioLines,
    title: "Audio Extraction",
    shortTitle: "Extract",
    description: "The system extracts the audio stream from the input video, separating speech from background noise and music using source separation techniques.",
    details: ["Noise reduction & source separation", "Multi-channel audio support", "Background music isolation"],
    color: "142 71% 55%",
  },
  {
    icon: Mic,
    title: "Speech Recognition (ASR)",
    shortTitle: "Transcribe",
    description: "A fine-tuned Whisper-based ASR model transcribes the extracted speech into text, handling diverse accents and multilingual audio with high accuracy.",
    details: ["Fine-tuned Whisper model", "95%+ accuracy on Sinhala/Tamil", "Real-time streaming transcription"],
    color: "142 71% 50%",
  },
  {
    icon: Languages,
    title: "Machine Translation",
    shortTitle: "Translate",
    description: "Neural machine translation models, specialized for Sinhala and Tamil language pairs, translate the transcribed text while preserving context and meaning.",
    details: ["Context-aware NMT", "Specialized for low-resource languages", "Preserves tone & semantics"],
    color: "142 71% 45%",
  },
  {
    icon: Volume2,
    title: "TTS & Audio Sync",
    shortTitle: "Dub",
    description: "Natural-sounding TTS generates dubbed audio in the target language. Prosody matching ensures the dubbed audio aligns with the original video timing.",
    details: ["Voice cloning capabilities", "Prosody & timing alignment", "Natural intonation patterns"],
    color: "142 71% 40%",
  },
  {
    icon: Captions,
    title: "Subtitles & Accessibility",
    shortTitle: "Output",
    description: "Synchronized subtitles are generated with precise timestamps. An experimental sign language avatar provides additional accessibility for the deaf community.",
    details: ["Precise timestamp sync", "Multi-format subtitle export", "Sign language avatar (research)"],
    color: "142 71% 35%",
  },
];

const SLIDE_MS = 4000;

/* ── Interactive pipeline nav ── */
const PipelineNav = ({
  activeStep,
  setActiveStep,
}: {
  activeStep: number;
  setActiveStep: (n: number) => void;
}) => (
  <div
    className="mx-auto flex max-w-4xl items-center justify-start sm:justify-center gap-0 overflow-x-auto pb-2 sm:pb-0"
    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
  >
    {steps.map((step, i) => (
      <div key={i} className="flex items-center">
        <button
          onClick={() => setActiveStep(i)}
          className={`group relative flex shrink-0 cursor-pointer flex-col items-center gap-1.5 sm:gap-2 rounded-2xl px-2.5 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 ${
            activeStep === i ? "bg-primary/15 scale-105" : "hover:bg-muted/50"
          }`}
        >
          <div
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-all duration-300 ${
              activeStep === i
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(142_71%_45%/0.3)]"
                : i < activeStep
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            }`}
          >
            {i < activeStep ? <CheckCircle2 size={20} /> : <step.icon size={20} />}
          </div>
          <span
            className={`text-xs font-medium transition-colors ${
              activeStep === i ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {step.shortTitle}
          </span>
        </button>

        {i < steps.length - 1 && (
          <div className="flex items-center px-0.5 sm:px-1">
            <div
              className={`h-px w-4 sm:w-8 transition-colors duration-500 ${
                i < activeStep ? "bg-primary" : "bg-border"
              }`}
            />
            <ChevronRight
              size={14}
              className={`transition-colors duration-500 ${
                i < activeStep ? "text-primary" : "text-muted-foreground/30"
              }`}
            />
          </div>
        )}
      </div>
    ))}
  </div>
);

/* ── Step detail panel ── */
const StepDetail = ({ step, index }: { step: Step; index: number }) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, y: 20, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.98 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="grid gap-6 md:gap-8 md:grid-cols-2 md:items-center"
  >
    {/* Left — visual */}
    <div className="relative flex items-center justify-center">
      <div
        className="absolute h-64 w-64 rounded-full blur-[80px]"
        style={{ background: `hsl(${step.color} / 0.15)` }}
      />
      <GlassCard className="relative w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: `hsl(${step.color})` }}
          >
            <step.icon size={36} className="text-white" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Step {index + 1}
            </span>
            <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold">{step.title}</h3>
          </div>
          {/* Animated ring */}
          <svg viewBox="0 0 120 120" className="absolute -right-4 -top-4 h-16 w-16 opacity-30">
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="314"
              animate={{ strokeDashoffset: [314, 0] }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>
        </div>
      </GlassCard>
    </div>

    {/* Right — description */}
    <div className="space-y-5">
      <p className="text-base leading-relaxed text-muted-foreground">{step.description}</p>
      <ul className="space-y-3">
        {step.details.map((detail, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 size={14} />
            </div>
            <span className="text-sm text-card-foreground">{detail}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  </motion.div>
);

/* ── Full vertical timeline ── */
const FullTimeline = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="relative">
      {/* Center line */}
      <motion.div
        className="absolute left-6 top-0 bottom-0 w-px bg-primary/30 md:left-1/2 md:-translate-x-px"
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : {}}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{ transformOrigin: "top" }}
      />

      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: i * 0.1 }}
          className={`relative mb-16 last:mb-0 flex items-start gap-6 md:gap-0 ${
            i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
          }`}
        >
          {/* Dot */}
          <div className="absolute left-6 top-2 z-10 md:left-1/2 md:-translate-x-1/2">
            <motion.div
              className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background"
              whileInView={{ scale: [0, 1.3, 1] }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            </motion.div>
          </div>

          {/* Content */}
          <div className={`ml-14 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-14 md:text-right" : "md:pl-14"}`}>
            <GlassCard className="group transition-shadow hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.2)]">
              <div className={`flex items-start gap-4 ${i % 2 === 0 ? "md:flex-row-reverse md:text-right" : ""}`}>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `hsl(${step.color} / 0.15)` }}
                >
                  <step.icon size={20} style={{ color: `hsl(${step.color})` }} />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ── Stats ── */
const stats = [
  { icon: Zap, value: "<50ms", label: "Processing Latency" },
  { icon: Clock, value: "Real-time", label: "Streaming Pipeline" },
  { icon: Shield, value: "Privacy", label: "No Data Stored" },
];

/* ── Smooth progress bar ── */
const ProgressBars = ({
  activeStep,
  paused,
}: {
  activeStep: number;
  paused: boolean;
}) => {
  const [fillWidth, setFillWidth] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    setFillWidth(0);

    if (paused) return;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / SLIDE_MS) * 100, 100);
      setFillWidth(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeStep, paused]);

  return (
    <div className="mx-auto mb-8 flex max-w-md gap-1.5">
      {steps.map((_, i) => (
        <div key={i} className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-none"
            style={{
              width:
                i < activeStep
                  ? "100%"
                  : i === activeStep
                  ? `${fillWidth}%`
                  : "0%",
            }}
          />
        </div>
      ))}
    </div>
  );
};

/* ── Main component ── */
const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(activeStep);
  stepRef.current = activeStep;

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, SLIDE_MS);
  }, []);

  useEffect(() => {
    if (!paused) {
      startInterval();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, startInterval]);

  const handleStepClick = (i: number) => {
    setActiveStep(i);
    if (!paused) startInterval();
  };

  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <SyntheticHero
        title="How Voxinity Works"
        badgeLabel="Pipeline"
        badgeText="5-Stage Process"
        subtitle="A real-time AI pipeline that transforms any video into a multilingual, accessible experience."
        showInput={false}
      />

      {/* Stats bar */}
      <section className="border-y border-border py-10 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {stats.map((s) => (
              <motion.div
                key={s.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Pipeline Explorer */}
      <section
        className="py-20"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="container mx-auto px-4">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Explore the Pipeline</h2>
            <p className="mt-3 text-muted-foreground">
              From raw audio to dubbed output — 5 AI stages, fully automated end-to-end
            </p>
          </motion.div>

          {/* Smooth progress bars */}
          <ProgressBars activeStep={activeStep} paused={paused} />

          {/* Pipeline navigation */}
          <div className="mb-14">
            <PipelineNav activeStep={activeStep} setActiveStep={handleStepClick} />
          </div>

          {/* Active step detail */}
          <div className="mx-auto max-w-4xl">
            <AnimatePresence mode="wait">
              <StepDetail step={steps[activeStep]} index={activeStep} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Full Timeline View */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">Complete Pipeline Flow</h2>
            <p className="mt-3 text-muted-foreground">Follow the journey from input to output</p>
          </motion.div>

          <FullTimeline />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold">See it in action</h2>
            <p className="mt-3 text-muted-foreground">Try the real-time dubbing pipeline yourself.</p>
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

export default HowItWorks;
