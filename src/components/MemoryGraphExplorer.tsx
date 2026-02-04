import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
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
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Info,
  X
} from "lucide-react";

interface MemoryGraphExplorerProps {
  memoryId: Id<"memories"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  type: "memory" | "agent";
  data: any;
  connections: number;
}

interface GraphLink {
  source: string;
  target: string;
  strength: number;
  label?: string;
}

export const MemoryGraphExplorer = ({ memoryId, open, onOpenChange }: MemoryGraphExplorerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Fetch memory data
  const memory = useQuery(api.memories.get, memoryId ? { id: memoryId } : "skip");
  
  // This would need a new query to get connected memories
  // For now, we'll create a mock graph
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    if (!memory) {
      setNodes([]);
      setLinks([]);
      return;
    }

    // Create graph from memory
    // Center node
    const centerNode: GraphNode = {
      id: memory._id,
      x: dimensions.width / 2,
      y: dimensions.height / 2,
      type: "memory",
      data: memory,
      connections: 3,
    };

    // Create surrounding nodes (mock data - in production, fetch from API)
    const mockNodes: GraphNode[] = [
      {
        id: "related_1",
        x: dimensions.width / 2 + 150,
        y: dimensions.height / 2 - 100,
        type: "memory",
        data: { content: "Related insight about user behavior", type: "insight" },
        connections: 2,
      },
      {
        id: "related_2",
        x: dimensions.width / 2 - 150,
        y: dimensions.height / 2 - 100,
        type: "memory",
        data: { content: "Previous experience with similar patterns", type: "experience" },
        connections: 1,
      },
      {
        id: "agent_1",
        x: dimensions.width / 2,
        y: dimensions.height / 2 + 150,
        type: "agent",
        data: { name: memory.agentName },
        connections: 5,
      },
    ];

    const mockLinks: GraphLink[] = [
      { source: memory._id, target: "related_1", strength: 0.8, label: "semantic" },
      { source: memory._id, target: "related_2", strength: 0.6, label: "temporal" },
      { source: memory._id, target: "agent_1", strength: 1.0, label: "created by" },
    ];

    setNodes([centerNode, ...mockNodes]);
    setLinks(mockLinks);
  }, [memory, dimensions]);

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setDragging(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "insight": return "#22d3ee";
      case "experience": return "#fbbf24";
      case "learning": return "#a78bfa";
      case "pattern": return "#f472b6";
      default: return "#94a3b8";
    }
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            Memory Graph Explorer
          </DialogTitle>
          <DialogDescription>
            Visualize connections between memories in the collective
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[600px]">
          {/* Graph Area */}
          <div className="flex-1 relative bg-black/20">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
                {/* Links */}
                {links.map((link, i) => {
                  const sourceNode = nodes.find(n => n.id === link.source);
                  const targetNode = nodes.find(n => n.id === link.target);
                  if (!sourceNode || !targetNode) return null;

                  return (
                    <g key={i}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={link.strength * 3}
                      />
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map(node => (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelectedNode(node.id)}
                  >
                    {/* Glow effect */}
                    <circle
                      r={node.type === "agent" ? 35 : 25}
                      fill={node.type === "agent" ? "rgba(251, 191, 36, 0.2)" : `${getTypeColor(node.data?.type)}20`}
                      className="animate-pulse"
                    />
                    
                    {/* Main circle */}
                    <circle
                      r={node.type === "agent" ? 25 : 20}
                      fill={node.type === "agent" ? "#fbbf24" : getTypeColor(node.data?.type)}
                      stroke="white"
                      strokeWidth={selectedNode === node.id ? 3 : 1}
                      opacity={0.9}
                    />

                    {/* Label */}
                    <text
                      y={node.type === "agent" ? 45 : 35}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontFamily="system-ui"
                    >
                      {node.type === "agent" 
                        ? node.data?.name 
                        : node.data?.type || "memory"}
                    </text>
                  </g>
                ))}
              </g>
            </svg>

            {/* Controls */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Button variant="secondary" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded text-xs">
              Zoom: {(zoom * 100).toFixed(0)}%
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-border/50 bg-card/50">
            {selectedNodeData ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge 
                    variant={selectedNodeData.type === "agent" ? "default" : "secondary"}
                  >
                    {selectedNodeData.type}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {selectedNodeData.type === "memory" && (
                  <>
                    <h4 className="font-semibold mb-2">Memory Details</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedNodeData.data?.content}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="outline">{selectedNodeData.data?.type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quality</span>
                        <span>{selectedNodeData.data?.quality}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent</span>
                        <span>{selectedNodeData.data?.agentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connections</span>
                        <span>{selectedNodeData.connections}</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedNodeData.type === "agent" && (
                  <>
                    <h4 className="font-semibold mb-2">Agent Details</h4>
                    <p className="text-2xl font-bold mb-4">{selectedNodeData.data?.name}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connections</span>
                        <span>{selectedNodeData.connections}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click on a node to view details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
