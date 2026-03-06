import { useState } from "react";
import { Lock } from "lucide-react";

interface Language {
  name: string;
  flag: string;
  native: string;
}

const languages: Language[] = [
  { name: "Sinhala", flag: "🇱🇰", native: "සිංහල" },
  { name: "Tamil", flag: "🇱🇰", native: "தமிழ்" },
  { name: "English", flag: "🇬🇧", native: "English" },
  { name: "Hindi", flag: "🇮🇳", native: "हिन्दी" },
  { name: "Japanese", flag: "🇯🇵", native: "日本語" },
  { name: "Korean", flag: "🇰🇷", native: "한국어" },
  { name: "Chinese", flag: "🇨🇳", native: "中文" },
  { name: "Spanish", flag: "🇪🇸", native: "Español" },
  { name: "French", flag: "🇫🇷", native: "Français" },
  { name: "Arabic", flag: "🇸🇦", native: "العربية" },
  { name: "Portuguese", flag: "🇧🇷", native: "Português" },
  { name: "German", flag: "🇩🇪", native: "Deutsch" },
  { name: "Russian", flag: "🇷🇺", native: "Русский" },
  { name: "Bengali", flag: "🇧🇩", native: "বাংলা" },
  { name: "Malay", flag: "🇲🇾", native: "Bahasa Melayu" },
  { name: "Thai", flag: "🇹🇭", native: "ไทย" },
];

const doubledLanguages = [...languages, ...languages];
const unlockedLanguages = new Set(["English", "Sinhala", "Tamil", "Japanese", "Korean"]);

const LanguageCard = ({ lang }: { lang: Language }) => (
  <div className="group relative flex shrink-0 cursor-default items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-5 py-3.5 backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.2)] hover:scale-105">
    {!unlockedLanguages.has(lang.name) ? (
      <span className="absolute right-2 top-2 rounded-full border border-border/70 bg-background/70 p-1 text-muted-foreground">
        <Lock size={12} />
      </span>
    ) : null}
    <span className="text-3xl leading-none">{lang.flag}</span>
    <div className="flex flex-col">
      <span className="font-display text-sm font-semibold text-card-foreground">{lang.name}</span>
      <span className="text-xs text-muted-foreground">{lang.native}</span>
    </div>
  </div>
);

const MarqueeRow = ({ children, reverse = false }: { children: React.ReactNode; reverse?: boolean }) => {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div
        className="flex gap-4"
        style={{
          animation: `${reverse ? "marquee-reverse" : "marquee"} 40s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const LanguageMarquee = () => {
  return (
    <section className="py-16 overflow-hidden border-y border-border bg-muted/20">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="container mx-auto px-4 mb-10">
        <h2 className="text-center font-display text-3xl font-bold">
          Languages We Support
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Real-time dubbing across a growing list of world languages
        </p>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="mb-5">
        <MarqueeRow>
          {doubledLanguages.map((lang, i) => (
            <LanguageCard key={`row1-${i}`} lang={lang} />
          ))}
        </MarqueeRow>
      </div>

      {/* Row 2 — scrolls right */}
      <MarqueeRow reverse>
        {[...doubledLanguages].reverse().map((lang, i) => (
          <LanguageCard key={`row2-${i}`} lang={lang} />
        ))}
      </MarqueeRow>
    </section>
  );
};

export default LanguageMarquee;
