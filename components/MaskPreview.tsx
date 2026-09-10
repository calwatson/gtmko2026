"use client";

import { layoutStats, layoutToMask } from "@/lib/layout/geometry";
import type { LayerId, Layout } from "@/lib/layout/types";

const LAYER_STYLE: Record<LayerId, { fill: string; opacity: number; label: string }> = {
  nwell: { fill: "#858585", opacity: 0.35, label: "N-well" },
  diffusion: { fill: "#e5e5e0", opacity: 0.8, label: "Diffusion" },
  "diffusion-p": { fill: "#c9a227", opacity: 0.3, label: "P diffusion" },
  "diffusion-n": { fill: "#3fa34d", opacity: 0.3, label: "N diffusion" },
  fin: { fill: "#d8d4c8", opacity: 0.95, label: "Fins" },
  poly: { fill: "#bf5975", opacity: 0.95, label: "Poly" },
  licon: { fill: "#625f58", opacity: 1, label: "LI contact" },
  "local-interconnect": { fill: "#ffcf8c", opacity: 0.8, label: "Local interconnect" },
  mcon: { fill: "#858078", opacity: 1, label: "M1 contact" },
  contact: { fill: "#efeae0", opacity: 1, label: "Contact" },
  metal1: { fill: "#4a7fd4", opacity: 0.5, label: "Metal 1" },
  via1: { fill: "#a9a49b", opacity: 1, label: "Via 1" },
  metal2: { fill: "#a6bfd9", opacity: 0.65, label: "Metal 2" },
  via2: { fill: "#8f8a7a", opacity: 1, label: "Via 2" },
  metal3: { fill: "#339edb", opacity: 0.55, label: "Metal 3" },
  via: { fill: "#8f8a7a", opacity: 1, label: "Via" },
  opc: { fill: "#f54e00", opacity: 0.9, label: "OPC" },
};

// Metal is drawn last but translucent so the gates below stay visible.
const DRAW_ORDER: LayerId[] = [
  "nwell",
  "diffusion",
  "diffusion-p",
  "diffusion-n",
  "fin",
  "poly",
  "licon",
  "local-interconnect",
  "mcon",
  "contact",
  "via",
  "metal1",
  "via1",
  "metal2",
  "via2",
  "metal3",
  "opc",
];

const SYNTHETIC_LEGEND: LayerId[] = ["fin", "poly", "contact", "metal1", "opc"];
const GDS_LEGEND: LayerId[] = [
  "diffusion",
  "poly",
  "local-interconnect",
  "metal1",
  "metal2",
  "metal3",
];

export function MaskPreview({ layout }: { layout: Layout }) {
  const mask = layoutToMask(layout);
  const stats = layoutStats(layout);
  const invalid = layout.errors.length > 0;
  const isGds = layout.provenance.kind === "gds";
  const legend = isGds ? GDS_LEGEND : SYNTHETIC_LEGEND;

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-fg">Intended mask</h2>
        <p className="text-xs text-fg/60">
          {isGds ? "Authentic SKY130 GDS crop" : "From layout code · not AI"}
        </p>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-card-04">
        {invalid ? (
          <p className="px-6 text-center text-sm text-fg/60">Fix recipe errors to draw the mask.</p>
        ) : (
          <svg
            viewBox={`${mask.minX} ${mask.minY} ${mask.width} ${mask.height}`}
            className="h-full max-h-[420px] w-full"
            role="img"
            aria-label="Chip mask preview"
          >
            <rect
              x={mask.minX}
              y={mask.minY}
              width={mask.width}
              height={mask.height}
              fill="#0c0b08"
            />
            {DRAW_ORDER.map((layer) => (
              <g key={layer} fill={LAYER_STYLE[layer].fill} opacity={LAYER_STYLE[layer].opacity}>
                {mask.shapes
                  .filter((shape) => shape.layer === layer)
                  .map((shape) =>
                    shape.kind === "rect" ? (
                      <rect
                        key={shape.id}
                        x={shape.x}
                        y={shape.y}
                        width={shape.w}
                        height={shape.h}
                      />
                    ) : shape.kind === "circle" ? (
                      <circle key={shape.id} cx={shape.cx} cy={shape.cy} r={shape.r} />
                    ) : (
                      <polygon
                        key={shape.id}
                        points={shape.points.map(([x, y]) => `${x},${y}`).join(" ")}
                      />
                    ),
                  )}
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg/60">
        {legend.map((layer) => (
          <span key={layer} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: LAYER_STYLE[layer].fill }}
            />
            {LAYER_STYLE[layer].label}
          </span>
        ))}
      </div>

      {isGds ? (
        <>
          <p className="mt-2 text-xs text-fg/80">
            <span className="text-accent">{stats.cells}</span> standard-cell instances · {stats.rows}{" "}
            rows · {(stats.widthNm / 1000).toFixed(0)} × {(stats.heightNm / 1000).toFixed(0)} µm
          </p>
          <a
            className="mt-1 text-[11px] text-fg/45 underline decoration-fg/20 underline-offset-2"
            href={
              layout.provenance.kind === "gds"
                ? layout.provenance.sourceUrl
                : "https://github.com/TinyTapeout/tinytapeout_gds_viewer"
            }
            target="_blank"
            rel="noreferrer"
          >
            TinyTapeout tinytapeout.gds · SKY130 · Apache-2.0
          </a>
        </>
      ) : (
        <p className="mt-2 text-xs text-fg/80">
          <span className="text-accent">{stats.transistors.toLocaleString()}</span> transistors ·{" "}
          {stats.cells} cells · {stats.rows} rows · {stats.widthNm} × {stats.heightNm} nm
        </p>
      )}
    </div>
  );
}
