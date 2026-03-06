import { useLocation, Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, Ghost } from "lucide-react";

/* ── floating particle ── */
const Particle = ({ delay }: { delay: number }) => {
  const x = Math.random() * 100;
  const size = 4 + Math.random() * 8;
  const duration = 4 + Math.random() * 4;

  return (
    <motion.div
      className="absolute rounded-full bg-primary/20"
      style={{ width: size, height: size, left: `${x}%`, bottom: -20 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: -600, opacity: [0, 0.6, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
};

const NotFound = () => {
  const location = useLocation();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  /* periodic glitch effect on the 404 number */
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerGlitch = useCallback(() => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 300);
  }, []);

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4">
      {/* floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <Particle key={i} delay={i * 0.6} />
        ))}
      </div>

      {/* ghost icon */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Ghost size={56} className="text-primary/60" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* 404 number */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onClick={triggerGlitch}
        className="relative cursor-pointer select-none font-display text-[8rem] font-black leading-none tracking-tighter sm:text-[10rem] lg:text-[12rem]"
      >
        <span
          className={`relative inline-block transition-all ${
            glitch ? "text-primary" : "text-foreground/10"
          }`}
        >
          404
          {/* glitch layers */}
          <AnimatePresence>
            {glitch && (
              <>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8, x: [0, -4, 3, -2, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 text-primary/60"
                  style={{ clipPath: "inset(20% 0 40% 0)" }}
                  aria-hidden
                >
                  404
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6, x: [0, 3, -4, 2, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 text-accent/40"
                  style={{ clipPath: "inset(60% 0 10% 0)" }}
                  aria-hidden
                >
                  404
                </motion.span>
              </>
            )}
          </AnimatePresence>
        </span>
      </motion.h1>

      {/* messaging */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-2 text-center"
      >
        <h2 className="font-display text-xl font-bold sm:text-2xl">
          Page not found
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          The page <span className="font-mono text-primary">{location.pathname}</span> doesn't
          exist or has been moved.
        </p>
      </motion.div>

      {/* actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button asChild size="lg">
          <Link to="/">
            <Home size={16} /> Go Home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" onClick={() => window.history.back()}>
          <span className="cursor-pointer">
            <ArrowLeft size={16} /> Go Back
          </span>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/help">
            <Search size={16} /> Help
          </Link>
        </Button>
      </motion.div>

      {/* subtle scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 3px)",
        }}
      />
    </main>
  );
};

export default NotFound;
