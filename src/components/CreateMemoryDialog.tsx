import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain } from "lucide-react";

interface CreateMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
}

export const CreateMemoryDialog = ({
  open,
  onOpenChange,
  workspaceId,
}: CreateMemoryDialogProps) => {
  const [agentId, setAgentId] = useState<string>("");
  const [type, setType] = useState<string>("insight");
  const [content, setContent] = useState("");
  const [quality, setQuality] = useState(4);
  const [saving, setSaving] = useState(false);

  const agents = useQuery(api.agents.list, { workspaceId });
  const storeMemory = useMutation(api.memories.store);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !content.trim()) return;

    setSaving(true);
    try {
      await storeMemory({
        agentId: agentId as Id<"agents">,
        type: type as "insight" | "experience" | "learning" | "pattern",
        content: content.trim(),
        quality,
      });
      setContent("");
      setAgentId("");
      setType("insight");
      setQuality(4);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Store a Memory
          </DialogTitle>
          <DialogDescription>
            Add a new memory to the collective consciousness.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent._id} value={agent._id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insight">Insight</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did the agent learn, discover, or experience?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Quality ({quality}/5)</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuality(n)}
                  className={`w-8 h-8 rounded-lg border transition-all ${
                    n <= quality
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted/30 border-border/50 text-muted-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={!agentId || !content.trim() || saving}
            >
              {saving ? "Storing..." : "Store Memory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
