import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface StepCardProps {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  isLast?: boolean;
}

const StepCard = ({ number, icon: Icon, title, description, isLast = false }: StepCardProps) => {
  return (
    <motion.div
      className="relative flex gap-6"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold text-lg">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className="pb-12">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={18} className="text-primary" />
          <h3 className="font-display text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground max-w-md">{description}</p>
      </div>
    </motion.div>
  );
};

export default StepCard;
