import GlassCard from "./GlassCard";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
}

const TestimonialCard = ({ quote, name, role }: TestimonialCardProps) => {
  return (
    <GlassCard className="flex flex-col gap-4">
      <Quote size={20} className="text-primary/40" />
      <p className="text-sm leading-relaxed text-muted-foreground italic">"{quote}"</p>
      <div className="mt-auto">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </GlassCard>
  );
};

export default TestimonialCard;
