import type { SchematicEdge, SchematicNode } from "@/lib/rtl/types";

type SchematicViewerProps = {
  width: number;
  height: number;
  nodes: SchematicNode[];
  edges: SchematicEdge[];
  highlightNodeIds: string[];
  highlightEdgeIds: string[];
};

function edgePath(from: SchematicNode, to: SchematicNode, height: number): string {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;

  if (startX <= endX) {
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
  }

  const feedbackY = height - 18;
  return `M ${startX} ${startY} V ${feedbackY} H ${endX - 18} V ${endY} H ${endX}`;
}

export function SchematicViewer({
  width,
  height,
  nodes,
  edges,
  highlightNodeIds,
  highlightEdgeIds,
}: SchematicViewerProps) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const highlightedNodes = new Set(highlightNodeIds);
  const highlightedEdges = new Set(highlightEdgeIds);

  return (
    <section className="rounded-xl bg-card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Generated RTL schematic</h2>
          <p className="mt-0.5 text-[11px] text-fg/40">
            Precomputed Yosys netlist · deterministic simulator highlight
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-accent">
          <span className="inline-block size-2 rounded-full bg-accent" />
          failing path
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg bg-card-04">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-h-[320px] min-w-[760px] w-full"
          role="img"
          aria-label="RTL schematic with failing accumulator path highlighted"
        >
          <defs>
            <marker
              id="schematic-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-fg/30" />
            </marker>
            <marker
              id="schematic-arrow-highlight"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const highlighted = highlightedEdges.has(edge.id);
            const labelX = (from.x + from.width + to.x) / 2;
            const labelY = (from.y + from.height / 2 + to.y + to.height / 2) / 2 - 6;

            return (
              <g key={edge.id}>
                <path
                  d={edgePath(from, to, height)}
                  fill="none"
                  className={highlighted ? "stroke-accent" : "stroke-fg/25"}
                  strokeWidth={highlighted ? 3 : 1.5}
                  markerEnd={
                    highlighted
                      ? "url(#schematic-arrow-highlight)"
                      : "url(#schematic-arrow)"
                  }
                />
                {edge.label ? (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    className={highlighted ? "fill-accent text-[9px]" : "fill-fg/35 text-[9px]"}
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {nodes.map((node) => {
            const highlighted = highlightedNodes.has(node.id);
            return (
              <g key={node.id} data-node-id={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={node.kind === "operator" ? node.height / 2 : 7}
                  className={highlighted ? "fill-accent/10 stroke-accent" : "fill-card-01 stroke-fg/25"}
                  strokeWidth={highlighted ? 3 : 1.5}
                />
                {node.kind === "register" ? (
                  <line
                    x1={node.x + 8}
                    y1={node.y}
                    x2={node.x + 8}
                    y2={node.y + node.height}
                    className={highlighted ? "stroke-accent" : "stroke-fg/25"}
                  />
                ) : null}
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 - 4}
                  textAnchor="middle"
                  className={highlighted ? "fill-accent text-[11px] font-medium" : "fill-fg/80 text-[11px]"}
                >
                  {node.label}
                </text>
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 13}
                  textAnchor="middle"
                  className="fill-fg/40 text-[9px]"
                >
                  {node.detail}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
