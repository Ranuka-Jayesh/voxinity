import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "processing";
}

const StatusBadge = ({ children, className, variant = "default" }: StatusBadgeProps) => {
  const variants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-primary/10 text-primary",
    warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    processing: "bg-primary/10 text-primary animate-pulse",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
