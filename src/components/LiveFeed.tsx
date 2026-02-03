import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export const LiveFeed = ({ className }: { className?: string }) => {
  const activities = useQuery(api.activities.list, { limit: 15 });

  return (
    <div className={cn("glass-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="font-semibold text-sm">Live Memory Stream</h3>
        </div>

        <span className="text-xs font-mono px-2 py-1 rounded-full bg-primary/20 text-primary">
          LIVE
        </span>
      </div>

      {/* Feed items */}
      <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
        {activities === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 rounded-full bg-primary/50 animate-pulse" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet. Store a memory to get started.
          </p>
        ) : (
          activities.map((item, index) => (
            <div
              key={item._id}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-all duration-500",
                "border border-transparent hover:border-border/50 hover:bg-muted/20",
                index === 0 && "animate-fade-in-up"
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
                  {formatTime(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
