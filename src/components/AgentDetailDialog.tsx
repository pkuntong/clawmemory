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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Key, 
  Copy, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  Check,
  Clock,
  Database,
  Activity
} from "lucide-react";
import { toast } from "sonner";

interface AgentDetailDialogProps {
  agentId: Id<"agents"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AgentDetailDialog = ({ agentId, open, onOpenChange }: AgentDetailDialogProps) => {
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const agent = useQuery(api.agents.get, agentId ? { id: agentId } : "skip");
  const apiKeyInfo = useQuery(api.agents.getApiKey, agentId ? { id: agentId } : "skip");
  
  const regenerateKey = useMutation(api.agents.regenerateApiKey);
  const deleteAgent = useMutation(api.agents.remove);

  const handleCopyId = async () => {
    if (!agent) return;
    await navigator.clipboard.writeText(agent._id);
    toast.success("Agent ID copied");
  };

  const handleRegenerateKey = async () => {
    if (!agentId) return;
    
    setRegenerating(true);
    try {
      const result = await regenerateKey({ id: agentId });
      toast.success("API key regenerated", {
        description: "Your new API key is ready. Copy it now - it won't be shown again!",
        duration: 10000,
      });
      // Show the key in a modal or toast
      console.log("New API Key:", result.apiKey);
    } catch (error) {
      toast.error("Failed to regenerate key");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!agentId) return;
    
    try {
      await deleteAgent({ id: agentId });
      toast.success("Agent deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete agent");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "syncing": return "bg-yellow-500";
      case "idle": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  if (!agent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-border/50 max-w-2xl">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading agent...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {agent.name}
            </DialogTitle>
          </div>
          <DialogDescription>
            Agent details and API key management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <Database className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{agent.memoriesCount}</p>
                <p className="text-xs text-muted-foreground">Memories</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <Activity className="w-5 h-5 mx-auto mb-2 text-secondary" />
                <p className="text-2xl font-bold capitalize">{agent.status}</p>
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-accent" />
                <p className="text-sm font-medium">
                  {new Date(agent.lastActive).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">Last Active</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Agent ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={agent._id} readOnly className="font-mono text-sm bg-black/20" />
                  <Button variant="outline" size="icon" onClick={handleCopyId}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {agent.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{agent.description}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Permissions</Label>
                <div className="flex gap-2 mt-1">
                  {agent.permissions?.map((perm) => (
                    <Badge key={perm} variant="secondary">{perm}</Badge>
                  )) || (
                    <Badge variant="secondary">read</Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                <p>Created: {formatDate(agent.createdAt)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-500">API Key Management</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your API key is used to authenticate your agent with ClawMemory. 
                    Keep it secret and secure.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Current API Key Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={apiKeyInfo?.hasApiKey ? "default" : "destructive"}>
                    {apiKeyInfo?.hasApiKey ? "Active" : "No Key"}
                  </Badge>
                  {apiKeyInfo?.createdAt && (
                    <span className="text-sm text-muted-foreground">
                      Created {formatDate(apiKeyInfo.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  To regenerate your API key:
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Click the button below</li>
                  <li>Copy the new key immediately (it's only shown once)</li>
                  <li>Update your applications with the new key</li>
                  <li>The old key will stop working immediately</li>
                </ol>
              </div>

              <Button 
                variant="outline" 
                onClick={handleRegenerateKey}
                disabled={regenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? "Regenerating..." : "Regenerate API Key"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <div className="border border-destructive/50 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-destructive">Delete Agent</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This action cannot be undone. This will permanently delete the agent
                    and all associated memories from the collective consciousness.
                  </p>
                </div>
              </div>

              {!showDeleteConfirm ? (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Agent
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Are you absolutely sure? Type the agent name "{agent.name}" to confirm:
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder={`Type "${agent.name}" to confirm`}
                      className="flex-1"
                    />
                    <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
