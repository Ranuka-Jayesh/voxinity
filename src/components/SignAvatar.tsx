import { AnimatePresence, motion } from "framer-motion";
import { Hand, BookOpen, MessageSquareText } from "lucide-react";

export type SignAvatarProps = {
  text?: string;
  gesture?: string;
  isActive?: boolean;
  compact?: boolean;
};

const SignAvatar = ({
  text = "",
  gesture = "",
  isActive = false,
  compact = false,
}: SignAvatarProps) => {
  if (!isActive) return null;

  const currentGesture = gesture;
  const hasGesture = Boolean(currentGesture);

  const avatarAnimation =
    currentGesture === "wave"
      ? { rotate: [0, 14, -10, 14, 0] }
      : currentGesture === "yes"
        ? { y: [0, 5, 0, 5, 0] }
        : currentGesture === "no"
          ? { x: [0, -8, 8, -8, 0] }
          : currentGesture === "help"
            ? { scale: [1, 1.12, 1] }
            : currentGesture === "start"
              ? { y: [0, -6, 0] }
              : currentGesture === "complete"
                ? { rotate: [0, 4, -4, 0], scale: [1, 1.06, 1] }
          : currentGesture === "learn"
            ? { scale: [1, 1.08, 1] }
            : { opacity: [0.7, 1, 0.7] };

  return (
    <div className={`glass rounded-2xl ${compact ? "p-3 max-w-xs" : "p-6"}`}>
      <div className={`flex items-center gap-2 ${compact ? "mb-2" : "mb-4"}`}>
        <Hand size={16} className="text-primary" />
        <h3 className="font-display text-sm font-semibold">{compact ? "Sign" : "Sign Avatar"}</h3>
      </div>

      <div className={`rounded-xl border border-primary/20 bg-muted/20 ${compact ? "p-3" : "p-5"}`}>
        <div className={`flex items-center ${compact ? "gap-3" : "gap-4"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGesture || "idle"}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1, ...avatarAnimation }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 0.4 }}
              className={`flex items-center justify-center rounded-full bg-primary/15 text-primary ${
                compact ? "h-12 w-12" : "h-16 w-16"
              }`}
            >
              {currentGesture === "learn" ? <BookOpen size={compact ? 20 : 26} /> : <Hand size={compact ? 20 : 26} />}
            </motion.div>
          </AnimatePresence>

          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground">Current Gesture</p>
            <p className="text-sm font-medium text-foreground truncate">
              {hasGesture ? currentGesture.replace(/_/g, " ") : "Idle"}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MessageSquareText size={12} />
              {text || "Waiting for translated segments..."}
            </p>
          </div>
        </div>
      </div>

      {!hasGesture && null}
    </div>
  );
};

export default SignAvatar;
