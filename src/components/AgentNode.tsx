import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  status: "active" | "syncing" | "idle";
  memoriesCount: number;
  lastActive: string;
}

interface AgentNodeProps {
  agent: Agent;
  className?: string;
}

const statusStyles = {
  active: {
    ring: "ring-primary shadow-glow-sm",
    dot: "bg-primary animate-pulse",
    label: "text-primary",
  },
  syncing: {
    ring: "ring-secondary shadow-glow-amber",
    dot: "bg-secondary animate-pulse",
    label: "text-secondary",
  },
  idle: {
    ring: "ring-muted-foreground/30",
    dot: "bg-muted-foreground",
    label: "text-muted-foreground",
  },
};

export const AgentNode = ({ agent, className }: AgentNodeProps) => {
  const styles = statusStyles[agent.status];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-4 group cursor-pointer",
        className
      )}
    >
      {/* Avatar with status ring */}
      <div className="relative">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            "bg-muted/50 border border-border/50 ring-2 ring-offset-2 ring-offset-background",
            "transition-all duration-300 group-hover:scale-105",
            styles.ring
          )}
        >
          <Bot className="w-8 h-8 text-foreground/70" />
        </div>
        
        {/* Status dot */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
            styles.dot
          )}
        />
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="font-medium text-sm text-foreground">
          {agent.name}
        </p>
        <p className={cn("text-xs font-mono capitalize", styles.label)}>
          {agent.status}
        </p>
      </div>

      {/* Stats */}
      <div className="text-center">
        <p className="text-lg font-bold font-mono text-foreground">
          {agent.memoriesCount}
        </p>
        <p className="text-xs text-muted-foreground">memories</p>
      </div>
    </div>
  );
};
