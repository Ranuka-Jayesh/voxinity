"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { Badge } from "@/components/ui/badge";
import { Link2, Upload, ArrowRight, Lock, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

gsap.registerPlugin(SplitText, useGSAP);

/** CSS-only animated backdrop (avoids WebGL / Three.js context issues on some GPUs). */
const HeroAmbientBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#061016]">
    <div
      className="pointer-events-none absolute -inset-[42%] animate-hero-aurora opacity-[0.92] will-change-transform"
      style={{
        background:
          "radial-gradient(ellipse 75% 55% at 50% 45%, rgba(20, 184, 166, 0.5) 0%, rgba(13, 148, 136, 0.18) 48%, transparent 72%)",
      }}
    />
    <div
      className="pointer-events-none absolute -inset-[38%] animate-hero-aurora opacity-55 blur-[72px] will-change-transform [animation-delay:-9s]"
      style={{
        background:
          "radial-gradient(circle at 38% 42%, rgba(45, 212, 191, 0.38), transparent 52%), radial-gradient(circle at 72% 62%, rgba(15, 118, 110, 0.48), transparent 48%)",
      }}
    />
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  </div>
);

interface HeroProps {
  title?: string;
  badgeText?: string;
  badgeLabel?: string;
  subtitle?: string;
  microDetails?: Array<string>;
  showInput?: boolean;
  onUrlSubmit?: (url: string) => void;
  onFileUpload?: (file: File) => void;
  children?: React.ReactNode;
}

const SyntheticHero = ({
  title = "An experiment in light, motion, and the quiet chaos between.",
  badgeText = "Voxinity",
  badgeLabel = "Experience",
  subtitle,
  microDetails = [],
  showInput = true,
  onUrlSubmit,
  onFileUpload,
  children,
}: HeroProps) => {
  const [url, setUrl] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const badgeWrapperRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigate = useNavigate();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const { toast } = useToast();

  const ctaRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      if (!headingRef.current) return;

      document.fonts.ready.then(() => {
        const split = new SplitText(headingRef.current!, {
          type: "lines",
          wordsClass: "hero-lines",
        });

        gsap.set(split.lines, {
          filter: "blur(16px)",
          yPercent: 24,
          autoAlpha: 0,
          scale: 1.04,
          transformOrigin: "50% 100%",
        });

        if (badgeWrapperRef.current) {
          gsap.set(badgeWrapperRef.current, { autoAlpha: 0, y: -8 });
        }
        if (ctaRef.current) {
          gsap.set(ctaRef.current, { autoAlpha: 0, y: 8 });
        }

        const microItems = microRef.current
          ? Array.from(microRef.current.querySelectorAll("li"))
          : [];
        if (microItems.length > 0) {
          gsap.set(microItems, { autoAlpha: 0, y: 6 });
        }

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (badgeWrapperRef.current) {
          tl.to(
            badgeWrapperRef.current,
            { autoAlpha: 1, y: 0, duration: 0.5 },
            0,
          );
        }

        tl.to(
          split.lines,
          {
            filter: "blur(0px)",
            yPercent: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.9,
            stagger: 0.12,
          },
          0.1,
        );

        if (ctaRef.current) {
          tl.to(
            ctaRef.current,
            { autoAlpha: 1, y: 0, duration: 0.5 },
            "-=0.35",
          );
        }

        if (microItems.length > 0) {
          tl.to(
            microItems,
            { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 },
            "-=0.25",
          );
        }
      });
    },
    { scope: sectionRef },
  );

  useEffect(() => {
    let alive = true;
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!alive) return;
        setIsAuthenticated(response.ok);
      } catch {
        if (!alive) return;
        setIsAuthenticated(false);
      } finally {
        if (!alive) return;
        setAuthChecked(true);
      }
    };
    const onAuthChanged = () => {
      void checkAuth();
    };
    void checkAuth();
    window.addEventListener("vox-auth-changed", onAuthChanged);
    return () => {
      alive = false;
      window.removeEventListener("vox-auth-changed", onAuthChanged);
    };
  }, [API_BASE]);

  const goToSignup = () => {
    navigate("/login?mode=signup");
  };

  const isLocked = authChecked && !isAuthenticated;

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const goToDemoAndStart = () => {
    const cleanUrl = url.trim();
    if (!selectedFile && !cleanUrl) {
      toast({
        title: "Input required",
        description: "Paste a URL or upload a video first.",
        variant: "destructive",
      });
      return;
    }
    navigate("/demo", {
      state: {
        heroAutoStart: true,
        prefillUrl: cleanUrl,
        prefillFile: selectedFile,
      },
    });
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      <HeroAmbientBackground />

      {/* Content Overlay */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        {/* Badge */}
        <div ref={badgeWrapperRef} className="mb-6 inline-flex">
          <Badge
            variant="outline"
            className="rounded-full border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-md"
          >
            <span className="mr-2 text-white/60">{badgeLabel}</span>
            <span className="mx-2 h-3 w-px bg-white/30" />
            <span className="text-white/90">{badgeText}</span>
          </Badge>
        </div>

        {/* Heading */}
        <h1
          ref={headingRef}
          className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
        >
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-white/60 leading-relaxed">{subtitle}</p>
        )}

        {/* Interactive Input — only when showInput is true */}
        {showInput && (
          <div ref={ctaRef} className="mx-auto mt-10 max-w-2xl">
            <div className="relative flex flex-row items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.08] px-3 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_40px_rgba(0,0,0,0.25),0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-2xl backdrop-saturate-[1.8] transition-all duration-300 focus-within:border-white/40 focus-within:bg-white/[0.12] focus-within:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_8px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <Link2 size={20} className="shrink-0 text-white/40" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim()) {
                    if (isLocked) {
                      goToSignup();
                      return;
                    }
                    goToDemoAndStart();
                  }
                }}
                placeholder="Paste a YouTube URL…"
                className="min-w-0 flex-1 bg-transparent text-sm sm:text-base text-white placeholder:text-white/35 outline-none"
              />
              <div className="mx-1 h-6 w-px shrink-0 bg-white/15" />
              <button
                type="button"
                onClick={() => {
                  if (isLocked) {
                    goToSignup();
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.07] px-2.5 sm:px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/[0.12] hover:text-white cursor-pointer"
              >
                {isLocked ? <Lock size={15} /> : <Upload size={15} />}
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLocked) {
                    goToSignup();
                    return;
                  }
                  goToDemoAndStart();
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/80 text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all hover:bg-primary/90 cursor-pointer"
              >
                {isLocked ? <Lock size={18} /> : <ArrowRight size={18} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    onFileUpload?.(file);
                  }
                }}
              />
            </div>
            {selectedFile && (
              <div className="mt-3 rounded-2xl border border-white/20 bg-black/20 p-3 text-left backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/90">
                    <Paperclip size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{selectedFile.name}</p>
                    <p className="text-xs text-white/65">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Children slot for custom content */}
        {children && <div className="mt-10">{children}</div>}

        {/* Micro Details */}
        {microDetails.length > 0 && (
          <ul
            ref={microRef}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50"
          >
            {microDetails.map((detail, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-white/40" />
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SyntheticHero;
