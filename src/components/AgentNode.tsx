import { cn } from "@/lib/utils";
import { Bot, Copy, KeyRound, RefreshCw, Terminal } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export interface Agent {
  _id: Id<"agents">;
  name: string;
  status: "active" | "syncing" | "idle";
  description?: string;
  apiKey?: string;
  memoriesCount: number;
  lastActive: number;
}

interface AgentNodeProps {
  agent: Agent;
  className?: string;
  workspaceKey?: string;
  workspaceSecret?: string;
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

export const AgentNode = ({
  agent,
  className,
  workspaceKey,
  workspaceSecret,
}: AgentNodeProps) => {
  const styles = statusStyles[agent.status];
  const rotateApiKey = useMutation(api.agents.rotateApiKey);
  const apiBase =
    (import.meta.env.VITE_CONVEX_URL as string | undefined)?.replace(/\/$/, "") ??
    "https://YOUR_CONVEX_URL";
  const workspaceUser = workspaceKey ?? "WORKSPACE_KEY";
  const workspacePass = workspaceSecret ?? "WORKSPACE_SECRET";
  const curlSnippet = `curl -X POST "${apiBase}/api/memories" \\
  -u ${workspaceUser}:${workspacePass} \\
  -H "X-Agent-Key: ${agent.apiKey ?? "YOUR_AGENT_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"insight","content":"Agents aligned on shared memory.","quality":4}'`;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually." });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
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
      </DialogTrigger>

      <DialogContent className="glass-card border-border/60 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-secondary" />
            Agent Access
          </DialogTitle>
          <DialogDescription>
            Use this key to send memories from your agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {agent.description && (
            <p className="text-sm text-muted-foreground">
              {agent.description}
            </p>
          )}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground">API key</p>
            <div className="flex items-center gap-2">
              <Input
                value={agent.apiKey ?? "Generate via Connect Agent"}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  agent.apiKey
                    ? handleCopy(agent.apiKey, "API key")
                    : toast({
                        title: "No API key yet",
                        description: "Re-register the agent to generate one.",
                      })
                }
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    const result = await rotateApiKey({ id: agent._id });
                    if (result?.apiKey) {
                      await handleCopy(result.apiKey, "API key");
                    }
                  } catch {
                    toast({
                      title: "Rotation failed",
                      description: "Try again in a moment.",
                    });
                  }
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Terminal className="w-3.5 h-3.5" />
              Send a memory
            </div>
            <pre className="bg-muted/40 border border-border/60 rounded-lg p-3 text-xs font-mono text-foreground/90 overflow-x-auto">
              <code>{curlSnippet}</code>
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(curlSnippet, "cURL snippet")}
              className="px-2"
            >
              Copy snippet
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Last active: {new Date(agent.lastActive).toLocaleString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
