import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  image?: string;
  /** Small status label (e.g. “Coming soon”) for planned features */
  badgeLabel?: string;
}

const FeatureCard = ({ icon: Icon, title, description, image, badgeLabel }: FeatureCardProps) => {
  const clipId = `card-clip-${title.replace(/\s+/g, "-")}`;
  const shapePath = "M32,0H203A17,17 0,0,1 220,17V33A17,17 0,0,0 237,50H273A17,17 0,0,1 290,67V288A32,32 0,0,1 258,320H32A32,32 0,0,1 0,288V32A32,32 0,0,1 32,0Z";

  return (
    <motion.div
      className="group relative w-full"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="relative mx-auto w-full" style={{ aspectRatio: "290 / 320" }}>
        {badgeLabel ? (
          <div
            className="pointer-events-none absolute left-2.5 z-20 sm:left-3"
            style={{ top: "10.5%" }}
            aria-label={badgeLabel}
          >
            <span className="inline-block rounded-md border border-border/70 bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur-sm">
              {badgeLabel}
            </span>
          </div>
        ) : null}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 290 320"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={shapePath} />
            </clipPath>
          </defs>

          {/* Card background */}
          <path d={shapePath} className="fill-card/80" />

          {/* Image clipped to the shape */}
          {image && (
            <image
              href={image}
              x="0"
              y="0"
              width="290"
              height="210"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
              className="transition-transform duration-500"
            />
          )}

          {/* Gradient overlay on image */}
          <rect
            x="0"
            y="160"
            width="290"
            height="60"
            fill="url(#fade-gradient)"
            clipPath={`url(#${clipId})`}
          />
          <defs>
            <linearGradient id="fade-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0" />
              <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Border stroke */}
          <path d={shapePath} fill="none" className="stroke-border/40" strokeWidth="1" />

          {/* Text via foreignObject */}
          <foreignObject x="16" y="215" width="258" height="100">
            <div className="space-y-1.5 px-1">
              <h3 className="font-display text-base font-semibold text-card-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{description}</p>
            </div>
          </foreignObject>
        </svg>

        {/* Icon badge — in the notch, outside SVG for interactivity */}
        <div
          className="absolute z-20 flex items-center justify-center"
          style={{ right: '2.5%', top: '2%', width: '16%', height: '13%' }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/20 backdrop-blur-md border border-primary/30 text-primary">
            <Icon className="h-[45%] w-[45%]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
