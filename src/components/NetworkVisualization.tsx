import { useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  connections: string[];
}

const typeColors: Record<string, string> = {
  insight: "hsl(185, 100%, 50%)",
  pattern: "hsl(35, 100%, 55%)",
  learning: "hsl(270, 80%, 60%)",
  experience: "hsl(185, 80%, 40%)",
};

function hashPosition(id: string, index: number, total: number): { x: number; y: number } {
  // Distribute nodes in a circle-ish layout with some deterministic jitter
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 0.25 + (index % 3) * 0.08;
  const x = 0.5 + Math.cos(angle) * radius;
  const y = 0.5 + Math.sin(angle) * radius;
  return { x: Math.max(0.1, Math.min(0.9, x)), y: Math.max(0.1, Math.min(0.9, y)) };
}

export const NetworkVisualization = ({ className }: { className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const memories = useQuery(api.memories.list, { limit: 12 });
  const connections = useQuery(api.connections.list, { limit: 50 });

  const { nodes, width, height } = useMemo(() => {
    const w = containerRef.current?.offsetWidth ?? 400;
    const h = containerRef.current?.offsetHeight ?? 300;

    if (!memories || memories.length === 0) {
      return { nodes: [] as NetworkNode[], width: w, height: h };
    }

    const nodeMap = new Map<string, NetworkNode>();

    memories.forEach((mem, i) => {
      const pos = hashPosition(mem._id, i, memories.length);
      nodeMap.set(mem._id, {
        id: mem._id,
        x: pos.x,
        y: pos.y,
        radius: 6 + Math.min(mem.quality * 2, 10),
        color: typeColors[mem.type] ?? typeColors.insight,
        label: mem.content.slice(0, 25) + "...",
        connections: [],
      });
    });

    if (connections) {
      for (const conn of connections) {
        const src = nodeMap.get(conn.sourceMemoryId);
        const tgt = nodeMap.get(conn.targetMemoryId);
        if (src && tgt) {
          src.connections.push(tgt.id);
          tgt.connections.push(src.id);
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), width: w, height: h };
  }, [memories, connections]);

  const getNodePosition = (node: NetworkNode) => ({
    x: node.x * width,
    y: node.y * height,
  });

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-[300px]", className)}>
      {nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          {memories === undefined ? "Loading network..." : "No memories yet"}
        </div>
      ) : (
        <svg className="absolute inset-0 w-full h-full">
          {/* Draw connections */}
          {nodes.map((node) =>
            node.connections.map((targetId) => {
              const target = nodes.find((n) => n.id === targetId);
              if (!target || node.id > targetId) return null;

              const start = getNodePosition(node);
              const end = getNodePosition(target);
              const isHighlighted = hoveredNode === node.id || hoveredNode === targetId;

              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isHighlighted ? "hsl(185, 100%, 50%)" : "hsl(225, 20%, 20%)"}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.3}
                  className="transition-all duration-300"
                />
              );
            })
          )}

          {/* Draw nodes */}
          {nodes.map((node) => {
            const pos = getNodePosition(node);
            const isHovered = hoveredNode === node.id;
            const isConnected = hoveredNode
              ? nodes.find((n) => n.id === hoveredNode)?.connections.includes(node.id)
              : false;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={node.radius * 2}
                  fill={node.color}
                  opacity={isHovered ? 0.3 : isConnected ? 0.15 : 0.1}
                  className="transition-all duration-300"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? node.radius * 1.2 : node.radius}
                  fill={node.color}
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered
                      ? `drop-shadow(0 0 10px ${node.color})`
                      : "none",
                  }}
                />
                {isHovered && (
                  <text
                    x={pos.x}
                    y={pos.y - node.radius - 10}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-mono"
                  >
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Insight</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary" />
          <span>Pattern</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span>Learning</span>
        </div>
      </div>
    </div>
  );
};
