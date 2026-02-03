import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface FeedItem {
  id: string;
  agentName: string;
  action: string;
  target: string;
  timestamp: Date;
}

const generateFeedItem = (): FeedItem => {
  const agents = ["Agent-Alpha", "Agent-Beta", "Agent-Gamma", "Agent-Delta", "Agent-Omega"];
  const actions = ["stored", "accessed", "synced", "evolved", "connected"];
  const targets = [
    "problem-solving pattern",
    "user interaction insight",
    "automation workflow",
    "learning module",
    "context bridge",
    "collective memory",
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    agentName: agents[Math.floor(Math.random() * agents.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    target: targets[Math.floor(Math.random() * targets.length)],
    timestamp: new Date(),
  };
};

export const LiveFeed = ({ className }: { className?: string }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Initial items
    setItems(Array.from({ length: 5 }, generateFeedItem));

    if (!isLive) return;

    const interval = setInterval(() => {
      setItems((prev) => [generateFeedItem(), ...prev.slice(0, 9)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className={cn("glass-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className={cn(
            "w-4 h-4",
            isLive ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
          <h3 className="font-semibold text-sm">Live Memory Stream</h3>
        </div>
        
        <button
          onClick={() => setIsLive(!isLive)}
          className={cn(
            "text-xs font-mono px-2 py-1 rounded-full transition-colors",
            isLive
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {isLive ? "LIVE" : "PAUSED"}
        </button>
      </div>

      {/* Feed items */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-2 rounded-lg transition-all duration-500",
              "border border-transparent hover:border-border/50 hover:bg-muted/20",
              index === 0 && isLive && "animate-fade-in-up"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
              index === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
            )} />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="text-primary font-medium">{item.agentName}</span>
                <span className="text-muted-foreground"> {item.action} </span>
                <span className="text-foreground">{item.target}</span>
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {formatTime(item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
