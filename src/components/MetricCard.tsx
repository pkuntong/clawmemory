import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "cyan" | "amber" | "purple";
  className?: string;
}

const variantStyles = {
  cyan: {
    icon: "text-primary",
    glow: "group-hover:shadow-glow-sm",
    border: "group-hover:border-primary/50",
  },
  amber: {
    icon: "text-secondary",
    glow: "group-hover:shadow-glow-amber",
    border: "group-hover:border-secondary/50",
  },
  purple: {
    icon: "text-accent",
    glow: "group-hover:shadow-glow-purple",
    border: "group-hover:border-accent/50",
  },
};

export const MetricCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  variant = "cyan",
  className,
}: MetricCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "glass-card p-5 group cursor-pointer transition-all duration-300",
        styles.glow,
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          "bg-muted/50 border border-border/50",
          "group-hover:bg-muted transition-colors"
        )}>
          <Icon className={cn("w-6 h-6", styles.icon)} />
        </div>
        
        {trend && (
          <div className={cn(
            "text-xs font-mono px-2 py-1 rounded-full",
            trend === "up" && "bg-primary/10 text-primary",
            trend === "down" && "bg-destructive/10 text-destructive",
            trend === "neutral" && "bg-muted text-muted-foreground"
          )}>
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "neutral" && "→"}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className={cn(
          "text-3xl font-bold font-mono tracking-tight",
          styles.icon
        )}>
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-muted-foreground font-mono">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
};
