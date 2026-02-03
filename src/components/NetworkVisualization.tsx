import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  connections: string[];
}

const sampleNodes: NetworkNode[] = [
  { id: "1", x: 0.5, y: 0.3, radius: 12, color: "hsl(185, 100%, 50%)", label: "Problem Solving", connections: ["2", "3", "5"] },
  { id: "2", x: 0.3, y: 0.5, radius: 10, color: "hsl(35, 100%, 55%)", label: "User Patterns", connections: ["1", "4"] },
  { id: "3", x: 0.7, y: 0.4, radius: 8, color: "hsl(270, 80%, 60%)", label: "Automation", connections: ["1", "5"] },
  { id: "4", x: 0.2, y: 0.7, radius: 9, color: "hsl(185, 100%, 50%)", label: "Learning", connections: ["2", "6"] },
  { id: "5", x: 0.8, y: 0.6, radius: 11, color: "hsl(35, 100%, 55%)", label: "Insights", connections: ["1", "3"] },
  { id: "6", x: 0.4, y: 0.8, radius: 7, color: "hsl(270, 80%, 60%)", label: "Context", connections: ["4"] },
];

export const NetworkVisualization = ({ className }: { className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const getNodePosition = (node: NetworkNode) => ({
    x: node.x * dimensions.width,
    y: node.y * dimensions.height,
  });

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-[300px]", className)}>
      <svg className="absolute inset-0 w-full h-full">
        {/* Draw connections */}
        {sampleNodes.map((node) =>
          node.connections.map((targetId) => {
            const target = sampleNodes.find((n) => n.id === targetId);
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
        {sampleNodes.map((node) => {
          const pos = getNodePosition(node);
          const isHovered = hoveredNode === node.id;
          const isConnected = hoveredNode
            ? sampleNodes.find((n) => n.id === hoveredNode)?.connections.includes(node.id)
            : false;

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Glow effect */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={node.radius * 2}
                fill={node.color}
                opacity={isHovered ? 0.3 : isConnected ? 0.15 : 0.1}
                className="transition-all duration-300"
              />
              
              {/* Node */}
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
              
              {/* Label */}
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Core</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span>New</span>
        </div>
      </div>
    </div>
  );
};
