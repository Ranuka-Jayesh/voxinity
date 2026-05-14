import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import SignAvatar from "@/components/SignAvatar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, Play, Pause, Volume2, Captions, AlertCircle, Check, Loader2,
  Globe, Mic, AudioWaveform, Eye, ChevronRight, Zap, Clock, Link2, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "idle" | "processing" | "ready" | "error";
type DubApiResponse = { job_id: string };
type DubStatusResponse = {
  status: "queued" | "pending" | "processing" | "completed" | "failed";
  progress: string;
  output: string | null;
  error: string | null;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    translated_text?: string;
    gesture?: string;
  }>;
};
type TranslatedSegment = NonNullable<DubStatusResponse["segments"]>[number];
type SourceLanguage = "auto" | "en" | "ja" | "ko";
type TargetLanguage = "en" | "si" | "ta";

const sourceLanguageOptions: Array<{ value: Exclude<SourceLanguage, "auto">; label: string }> = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const targetLanguageOptions: Array<{ value: TargetLanguage; label: string; lowResource?: boolean }> = [
  { value: "si", label: "Sinhala", lowResource: true },
  { value: "ta", label: "Tamil", lowResource: true },
  { value: "en", label: "English" },
];

const mapPreferredLanguageToTarget = (preferred?: string | null): TargetLanguage | null => {
  const normalized = (preferred || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "sinhala") return "si";
  if (normalized === "tamil") return "ta";
  if (normalized === "english") return "en";
  return null;
};

const getCachedPreferredTargetLanguage = (): TargetLanguage => {
  const cached = window.localStorage.getItem("vox_preferred_language");
  const mapped = mapPreferredLanguageToTarget(cached);
  return mapped ?? "si";
};

const pipelineSteps = [
  { icon: Mic, label: "Extracting Audio" },
  { icon: AudioWaveform, label: "Transcribing Speech" },
  { icon: Globe, label: "Translating Text" },
  { icon: Volume2, label: "Generating Dubbed Audio" },
  { icon: Captions, label: "Synchronizing with Video" },
  { icon: Check, label: "Complete" },
];

const processingMessages = [
  "Extracting audio...",
  "Transcribing...",
  "Translating...",
  "Generating speech...",
  "Synchronizing...",
  "Merging video...",
];

const Voxinity = () => {
  type HeroLaunchState = {
    heroAutoStart?: boolean;
    prefillUrl?: string;
    prefillFile?: File | null;
  };
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState<SourceLanguage>("auto");
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<TargetLanguage>(() => getCachedPreferredTargetLanguage());
  const [outputMode, setOutputMode] = useState<"translate" | "sign">("translate");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState(processingMessages[0]);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState(true);
  const [signAvatar, setSignAvatar] = useState(false);
  const [signAvatarText, setSignAvatarText] = useState("Waiting for translated segments...");
  const [segments, setSegments] = useState<TranslatedSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `${window.location.protocol}//${window.location.hostname}:8000`;

  const stopProgressSimulation = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopProgressSimulation();
    };
  }, []);

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
        if (response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            user?: { preferred_language?: string | null };
          };
          const preferredLanguage = payload.user?.preferred_language ?? null;
          if (preferredLanguage) {
            window.localStorage.setItem("vox_preferred_language", preferredLanguage);
          }
          const mappedTarget = mapPreferredLanguageToTarget(preferredLanguage);
          if (mappedTarget) {
            setSelectedTargetLanguage(mappedTarget);
          }
        }
      } catch {
        if (!alive) return;
        setIsAuthenticated(false);
      } finally {
        if (alive) setAuthChecked(true);
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (videoPlayerRef.current) {
        setCurrentTime(videoPlayerRef.current.currentTime);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile);
      setInputPreviewUrl(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    }
    const trimmed = videoUrl.trim();
    if (trimmed) {
      setInputPreviewUrl(trimmed);
      return;
    }
    setInputPreviewUrl(null);
  }, [selectedFile, videoUrl]);

  const applyProgressMessage = (message: string) => {
    const normalized = message.toLowerCase();
    const matchedIndex = processingMessages.findIndex((m) =>
      normalized.includes(m.replace("...", "").toLowerCase())
    );
    setCurrentProcessingMessage(message);
    setSignAvatarText(message);
    if (matchedIndex === -1) {
      // e.g. "Waiting for ML worker..." — not a known pipeline step; don't map to 1/6 (16.67%).
      setActiveStep(-1);
      setProgress(0);
      return;
    }
    const stepIndex = matchedIndex;
    setActiveStep(Math.min(stepIndex, pipelineSteps.length - 1));
    setProgress(Math.min(((stepIndex + 1) / pipelineSteps.length) * 100, 98));
  };

  const toBackendVideoUrl = (outputPath: string) => {
    if (/^https?:\/\//i.test(outputPath)) return outputPath;
    const normalizedPath = outputPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return `http://localhost:8000/${normalizedPath}`;
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayPause = () => {
    const video = videoPlayerRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoPlayerRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const seekToPercent = (event: MouseEvent<HTMLDivElement>) => {
    const video = videoPlayerRef.current;
    if (!video || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);
    video.currentTime = ratio * duration;
  };

  const currentSegment = segments.find(
    (segment) => currentTime >= segment.start && currentTime <= segment.end
  );

  const handleDroppedFile = (file?: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setVideoUrl("");
    toast({
      title: "Video selected",
      description: `${file.name} is ready for dubbing.`,
    });
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleDroppedFile(event.dataTransfer.files?.[0]);
  };

  const handleSignLockedClick = () => {
    toast({
      title: "Sign mode is locked",
      description: "Interactive sign mode will be available in a future update.",
    });
  };

  const handleProcess = async (overrides?: { file?: File | null; url?: string }) => {
    const inputFile = overrides?.file ?? selectedFile;
    const inputUrl = (overrides?.url ?? videoUrl).trim();
    if (!isAuthenticated) {
      try {
        const authResponse = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (authResponse.ok) {
          setIsAuthenticated(true);
        } else {
          throw new Error("Not authenticated");
        }
      } catch {
        setIsAuthenticated(false);
        setAuthChecked(true);
        toast({
          title: "Sign in required",
          description: "Please sign in or sign up first to use dubbing.",
        });
        return;
      }
    }
    if (!inputFile && !inputUrl) {
      toast({ title: "Input required", description: "Upload a video file or paste a video URL.", variant: "destructive" });
      return;
    }
    setStatus("processing");
    setOutputVideoUrl(null);
    setSegments([]);
    setProgress(0);
    setActiveStep(0);
    setCurrentProcessingMessage(processingMessages[0]);
    setSignAvatarText(processingMessages[0]);

    try {
      const formData = new FormData();
      formData.append("source_language", selectedSourceLanguage);
      formData.append("target_language", selectedTargetLanguage);

      if (inputFile) {
        formData.append("video_file", inputFile);
      } else if (inputUrl) {
        formData.append("video_url", inputUrl);
      }

      const response = await fetch("http://localhost:8000/api/dub", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to process video.";
        try {
          const errorJson = (await response.json()) as { detail?: string };
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as DubApiResponse;
      const jobId = data.job_id;
      const progressUrl = `http://localhost:8000/api/dub/progress/${jobId}`;
      const statusUrl = `http://localhost:8000/api/dub/status/${jobId}`;

      const job = await new Promise<DubStatusResponse>((resolve, reject) => {
        let settled = false;
        let fallbackInterval: ReturnType<typeof setInterval> | undefined;
        const eventSource = new EventSource(progressUrl);

        const fail = (err: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackDelayTimer);
          if (fallbackInterval !== undefined) clearInterval(fallbackInterval);
          clearTimeout(giveUpTimer);
          eventSource.close();
          reject(err);
        };
        const ok = (result: DubStatusResponse) => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackDelayTimer);
          if (fallbackInterval !== undefined) clearInterval(fallbackInterval);
          clearTimeout(giveUpTimer);
          eventSource.close();
          resolve(result);
        };

        const parsePayload = (raw: string) => {
          try {
            return JSON.parse(raw) as {
              event?: string;
              message?: string;
              output?: string | null;
              segments?: DubStatusResponse["segments"];
              error?: string | null;
            };
          } catch {
            return null;
          }
        };

        eventSource.onmessage = (event) => {
          if (!event.data) return;
          const payload = parsePayload(event.data);
          if (!payload) {
            applyProgressMessage(event.data);
            return;
          }
          if (payload.event === "progress" && payload.message) {
            applyProgressMessage(payload.message);
          }
          if (payload.event === "completed") {
            ok({
              status: "completed",
              progress: "Completed",
              output: payload.output ?? null,
              segments: payload.segments ?? [],
              error: null,
            });
          }
          if (payload.event === "failed") {
            fail(new Error(payload.error || "Dubbing job failed."));
          }
        };

        /** Only if SSE stalls (starts after 25s; then one status check every 15s). */
        const fallbackDelayTimer = window.setTimeout(() => {
          fallbackInterval = window.setInterval(async () => {
            if (settled) return;
            try {
              const statusResponse = await fetch(statusUrl);
              if (!statusResponse.ok) return;
              const snap = (await statusResponse.json()) as DubStatusResponse;
              applyProgressMessage(snap.progress || processingMessages[0]);
              if (snap.status === "completed") ok(snap);
              if (snap.status === "failed") fail(new Error(snap.error || "Dubbing job failed."));
            } catch {
              /* ignore transient network errors */
            }
          }, 15_000);
        }, 25_000);

        const giveUpTimer = window.setTimeout(() => {
          fail(new Error("Dubbing timed out. Please try again."));
        }, 45 * 60 * 1000);
      });

      const playableVideoUrl = toBackendVideoUrl(job.output || "");
      setSegments(job.segments ?? []);
      setProgress(100);
      setActiveStep(pipelineSteps.length - 1);
      setCurrentProcessingMessage("Complete");
      setSignAvatarText(
        job.segments?.findLast((segment) => segment.translated_text)?.translated_text ||
          "Dubbed output ready.",
      );
      setOutputVideoUrl(playableVideoUrl);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setStatus("ready");
      toast({ title: "Processing Complete", description: "Dubbed video generated successfully." });
    } catch (error) {
      setStatus("error");
      setProgress(0);
      setActiveStep(-1);
      setOutputVideoUrl(null);

      const description =
        error instanceof Error
          ? error.message
          : "Something went wrong while dubbing your video.";
      toast({
        title: "Dubbing failed",
        description,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const launch = (location.state as HeroLaunchState | null) ?? null;
    if (!launch?.heroAutoStart) return;
    const prefillFile = launch.prefillFile ?? null;
    const prefillUrl = launch.prefillUrl ?? "";
    if (prefillFile) {
      setSelectedFile(prefillFile);
      setVideoUrl("");
    } else if (prefillUrl) {
      setVideoUrl(prefillUrl);
    }
    void handleProcess({ file: prefillFile, url: prefillUrl });
    navigate("/demo", { replace: true, state: null });
  }, [location.state, navigate]);

  const logs = [
    { time: "00:01", msg: "Extracting audio stream..." },
    { time: "00:03", msg: "Running ASR engine (Whisper)..." },
    { time: "00:08", msg: "Translating to target language..." },
    { time: "00:12", msg: "Generating TTS audio..." },
    { time: "00:15", msg: "Synchronizing dubbed audio..." },
    { time: "00:16", msg: "Generating subtitles..." },
  ];

  const mockSubtitles = [
    { ts: "00:00:01", text: "Welcome to this presentation on neural networks." },
    { ts: "00:00:05", text: "Today we'll explore how deep learning works." },
    { ts: "00:00:10", text: "Let's start with the fundamentals." },
    { ts: "00:00:15", text: "A neural network consists of layers of neurons." },
    { ts: "00:00:20", text: "Each neuron applies a weighted transformation." },
  ];

  return (
    <main className="overflow-hidden">
      {/* ── Input Bar ── */}
      <section className="pt-20 pb-4">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 space-y-3"
          >
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Watch any video dubbed into your language - instantly.
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Real-time AI dubbing
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                Synchronized translated speech
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                Sinhala & Tamil focus
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Low-resource target languages
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                Subtitles as optional support
              </span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── Pipeline Visualizer ── */}
      {status !== "idle" && (
        <section className="pb-4">
          <div className="container mx-auto px-4">
            <div className="glass rounded-2xl px-6 py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dubbing Pipeline</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {status === "processing" ? currentProcessingMessage : "Complete"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pipelineSteps.map((step, i) => (
                  <div key={step.label} className="flex min-w-0 items-center gap-1 sm:gap-2">
                    <motion.div
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                        i <= activeStep
                          ? "border-primary/30 bg-primary/15 text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                      animate={i === activeStep && status === "processing" ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <step.icon size={16} />
                    </motion.div>
                    <span className={`hidden md:block text-xs font-medium transition-colors ${
                      i <= activeStep ? "text-foreground" : "text-muted-foreground"
                    }`}>{step.label}</span>
                    {i < pipelineSteps.length - 1 && (
                      <ChevronRight size={14} className={`hidden sm:block shrink-0 transition-colors ${
                        i < activeStep ? "text-primary" : "text-muted-foreground/30"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              {status === "processing" && (
                <div className="mt-3">
                  <Progress value={progress} className="h-1.5" />
                  <p className="mt-1.5 text-center text-xs text-muted-foreground">
                    {currentProcessingMessage} ({Math.round(progress)}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Full-Width Output ── */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <GlassCard initial={false} className="relative overflow-hidden">
            <div className={`space-y-4 ${authChecked && !isAuthenticated ? "pointer-events-none select-none blur-[2px]" : ""}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Play size={16} />
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setOutputMode("translate")}
                    className={`min-w-[92px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      outputMode === "translate"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Translate
                  </button>
                  <button
                    type="button"
                    onClick={handleSignLockedClick}
                    className={`min-w-[92px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      outputMode === "sign"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Gesture
                      <Lock size={11} />
                    </span>
                  </button>
                </div>
              </div>
              <div className="hidden md:flex flex-1 items-center gap-2 rounded-2xl border border-primary/20 bg-background/30 px-4 py-2.5 mx-3 backdrop-blur-sm">
                  <Link2 size={14} className="text-muted-foreground/80" />
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleProcess(); }}
                    placeholder="Paste a YouTube URL..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/80"
                  />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
                <div className="hidden md:flex items-end gap-2">
                  <div className="min-w-[140px]">
                    <Label className="mb-1 block text-[10px] text-muted-foreground">Source</Label>
                    <Select
                      value={selectedSourceLanguage}
                      onValueChange={(value) => setSelectedSourceLanguage(value as SourceLanguage)}
                    >
                      <SelectTrigger className="h-10 bg-background/50 text-xs" aria-label="Source language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        {sourceLanguageOptions.map((lang) => (
                          <SelectItem key={`source-top-${lang.value}`} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[140px]">
                    <Label className="mb-1 block text-[10px] text-muted-foreground">Target</Label>
                    <Select
                      value={selectedTargetLanguage}
                      onValueChange={(value) => setSelectedTargetLanguage(value as TargetLanguage)}
                    >
                      <SelectTrigger className="h-10 bg-background/50 text-xs" aria-label="Target language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {targetLanguageOptions.map((lang) => (
                          <SelectItem key={`target-top-${lang.value}`} value={lang.value}>
                            {lang.lowResource ? `${lang.label} (focus)` : lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="hidden md:block h-7 w-px bg-border/70" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 px-4 py-2 text-sm font-semibold text-foreground/80 transition-all hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
                <Button
                  onClick={handleProcess}
                  disabled={status === "processing"}
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary)/0.6)] hover:bg-primary/90"
                >
                  {status === "processing" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Mic size={14} />
                  )}
                </Button>
                {status === "ready" && <StatusBadge variant="success"><Check size={10} /> Ready</StatusBadge>}
                {status === "error" && <StatusBadge variant="warning"><AlertCircle size={10} /> Error</StatusBadge>}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {status === "idle" ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-xl border border-dashed text-center transition-colors ${
                    isDragActive
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-muted/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  {inputPreviewUrl ? (
                    <div className="p-4">
                      <video
                        src={inputPreviewUrl}
                        controls
                        className="h-64 md:h-80 lg:h-96 w-full rounded-lg object-contain bg-black"
                      />
                      <p className="mt-3 text-sm font-medium text-muted-foreground">
                        Original video preview
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Click this area to replace with another video before processing.
                      </p>
                    </div>
                  ) : (
                    <div className="flex cursor-pointer flex-col items-center justify-center py-24">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Upload size={56} className="text-muted-foreground/30 mb-4" />
                      </motion.div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {selectedFile ? selectedFile.name : "Drop your video here"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Drag and drop a video file, or click to upload. You can also paste a URL above.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : status === "processing" ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative rounded-xl overflow-hidden bg-black/40">
                    <Skeleton className="h-64 md:h-80 lg:h-96 w-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="flex h-16 w-16 items-center justify-center rounded-full glass"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 size={24} className="text-primary" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="relative rounded-xl overflow-hidden group bg-black">
                    {outputVideoUrl ? (
                      <video
                        ref={videoPlayerRef}
                        src={outputVideoUrl}
                        className="w-full h-64 md:h-80 lg:h-96 object-contain bg-black"
                        autoPlay
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                        onEnded={() => setIsPlaying(false)}
                      />
                    ) : (
                      <Skeleton className="h-64 md:h-80 lg:h-96 w-full" />
                    )}

                    {/* Subtitle overlay */}
                    {subtitles && currentSegment?.translated_text && (
                      <motion.div
                        className="absolute bottom-16 inset-x-4 flex justify-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="rounded-lg bg-black/70 px-5 py-2.5 text-sm text-white backdrop-blur-sm">
                          {currentSegment.translated_text}
                        </div>
                      </motion.div>
                    )}

                    {signAvatar && (
                      <div className="absolute top-4 right-4 z-20 pointer-events-none max-w-[280px]">
                        <SignAvatar
                          text={currentSegment?.translated_text || signAvatarText}
                          gesture={currentSegment?.gesture || "idle"}
                          isActive={signAvatar}
                          compact
                        />
                      </div>
                    )}

                    {/* Player controls */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="text-white hover:text-primary transition-colors cursor-pointer"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div
                        className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                        onClick={seekToPercent}
                      >
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/70 font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <button
                        className="text-white hover:text-primary transition-colors cursor-pointer"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        onClick={toggleMute}
                      >
                        <Volume2 size={16} className={isMuted ? "opacity-50" : ""} />
                      </button>
                      <button
                        className="text-white hover:text-primary transition-colors cursor-pointer"
                        aria-label="Captions"
                        onClick={() => setSubtitles((prev) => !prev)}
                      >
                        <Captions size={16} className={subtitles ? "text-primary" : ""} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
            {authChecked && !isAuthenticated && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 text-center shadow-xl">
                  <p className="text-base font-semibold text-foreground">Sign in / Sign up first</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Please log in to upload videos and start dubbing.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/login">Sign Up</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

        </div>
      </section>

    </main>
  );
};

export default Voxinity;
