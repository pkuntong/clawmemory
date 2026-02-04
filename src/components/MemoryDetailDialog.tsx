import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Clock, 
  Star, 
  Tag, 
  User, 
  GitBranch, 
  X,
  Trash2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface MemoryDetailDialogProps {
  memoryId: Id<"memories"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MemoryDetailDialog = ({ memoryId, open, onOpenChange }: MemoryDetailDialogProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch memory details
  const memory = useQuery(api.memories.get, memoryId ? { id: memoryId } : "skip");
  const relatedMemories = useQuery(
    api.memories.getRelated, 
    memoryId ? { memoryId } : "skip"
  );
  
  const deleteMemory = useMutation(api.memories.remove);

  const handleDelete = async () => {
    if (!memoryId) return;
    
    try {
      await deleteMemory({ id: memoryId });
      toast.success("Memory deleted");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete memory");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "insight": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "experience": return "bg-amber-500/20 text-amber-400 border-amber-500/50";
      case "learning": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "pattern": return "bg-pink-500/20 text-pink-400 border-pink-500/50";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "insight": return "💡";
      case "experience": return "📖";
      case "learning": return "🎓";
      case "pattern": return "🔄";
      default: return "📝";
    }
  };

  if (!memory) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-border/50 max-w-2xl">
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading memory...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getTypeIcon(memory.type)}</span>
              <div>
                <Badge className={`${getTypeColor(memory.type)} capitalize mb-1`}>
                  {memory.type}
                </Badge>
                <DialogTitle className="text-lg font-semibold">
                  Memory Details
                </DialogTitle>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {memory.content}
                </p>
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  Agent
                </div>
                <p className="font-medium">{memory.agentName}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Created
                </div>
                <p className="font-medium">
                  {formatDistanceToNow(memory.createdAt, { addSuffix: true })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4" />
                  Quality
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < memory.quality 
                          ? "fill-yellow-500 text-yellow-500" 
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="w-4 h-4" />
                  Connections
                </div>
                <p className="font-medium">{relatedMemories?.length || 0} related</p>
              </div>
            </div>

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {memory.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Related Memories */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Related Memories</h3>
                <Badge variant="outline" className="text-xs">
                  {relatedMemories?.length || 0}
                </Badge>
              </div>

              {relatedMemories && relatedMemories.length > 0 ? (
                <div className="space-y-2">
                  {relatedMemories.map((related) => (
                    <div
                      key={related._id}
                      className="bg-muted/20 p-3 rounded-lg border border-border/30 hover:border-border/60 transition-colors cursor-pointer"
                      onClick={() => {
                        // Would open related memory in new dialog or navigate
                        toast.info("Navigation to related memory coming soon");
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm line-clamp-2 flex-1">
                          {related.content}
                        </p>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {related.type}
                        </Badge>
                        <span>•</span>
                        <span>{related.agentName}</span>
                        {related.connectionStrength && (
                          <>
                            <span>•</span>
                            <span className="text-primary">
                              {Math.round(related.connectionStrength * 100)}% match
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No related memories found
                </p>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                ID: {memory._id}
              </div>
              
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Memory
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Are you sure?</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Confirm Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
