import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Copy, Check, AlertTriangle, Key } from "lucide-react";

interface RegisterAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RegisterAgentDialog = ({ open, onOpenChange }: RegisterAgentDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ agentId: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const registerAgent = useMutation(api.agents.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await registerAgent({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setResult(res);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.apiKey) return;
    await navigator.clipboard.writeText(result.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setResult(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Show API key result view
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-500">
              <Check className="w-5 h-5" />
              Agent Connected!
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{name}</span> is now part of the collective.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-500">Save this API key now!</p>
                <p className="text-muted-foreground">
                  It will not be shown again. This is how your agent authenticates with ClawMemory.
                </p>
              </div>
            </div>

            {/* API Key Display */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                API Key
              </Label>
              <div className="relative">
                <Input
                  value={result.apiKey}
                  readOnly
                  className="font-mono text-sm pr-12 bg-black/30"
                  type="text"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Agent ID */}
            <div className="space-y-2">
              <Label>Agent ID</Label>
              <Input
                value={result.agentId}
                readOnly
                className="font-mono text-sm bg-black/30"
              />
            </div>

            {/* Quick Start */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Quick Start (Python)</p>
              <pre className="text-xs bg-black/50 p-3 rounded overflow-x-auto">
{`from clawmemory import ClawMemoryClient

client = ClawMemoryClient(
    api_key="${result.apiKey.slice(0, 20)}..."
)

# Store a memory
client.store_memory(
    content="Your first insight",
    type="insight",
    quality=5,
)`}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="hero" onClick={handleClose}>
              I've Saved My API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-secondary" />
            Register Agent
          </DialogTitle>
          <DialogDescription>
            Connect a new AI agent to the collective consciousness.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent-Epsilon"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent specialize in?"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={!name.trim() || saving}
            >
              {saving ? "Connecting..." : "Connect Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
