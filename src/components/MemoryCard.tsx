import { Brain, Clock, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  agentId: string;
  agentName: string;
  type: "insight" | "experience" | "learning" | "pattern";
  content: string;
  connections: number;
  timestamp: string;
  quality: number;
}

interface MemoryCardProps {
  memory: Memory;
  className?: string;
}

const typeConfig = {
  insight: { icon: Sparkles, label: "Insight", color: "text-primary" },
  experience: { icon: Brain, label: "Experience", color: "text-secondary" },
  learning: { icon: Sparkles, label: "Learning", color: "text-accent" },
  pattern: { icon: Link2, label: "Pattern", color: "text-primary" },
};

export const MemoryCard = ({ memory, className }: MemoryCardProps) => {
  const config = typeConfig[memory.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "memory-card p-5 group cursor-pointer",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-muted/50 border border-border/50",
            "group-hover:border-primary/50 transition-colors"
          )}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {memory.agentName}
            </p>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              "bg-muted/50 border border-border/50",
              config.color
            )}>
              {config.label}
            </span>
          </div>
        </div>
        
        {/* Quality indicator */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i < memory.quality
                  ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground/90 text-sm leading-relaxed mb-4">
        {memory.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-primary/70" />
            <span>{memory.connections} connections</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{memory.timestamp}</span>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-primary">View details →</span>
        </div>
      </div>
    </div>
  );
};
