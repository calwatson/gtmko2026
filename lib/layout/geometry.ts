import { CELL_H, transistorsIn } from "./cells";
import type { Layout, LayoutRect, LayoutShape } from "./types";

export type MaskView = {
  shapes: LayoutShape[];
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type LayoutStats = {
  transistors: number;
  cells: number;
  rows: number;
  widthNm: number;
  heightNm: number;
};

function isPoly(shape: LayoutShape): shape is LayoutRect {
  return shape.kind === "rect" && shape.layer === "poly";
}

/** OPC only decorates poly, where gate CD control actually matters. */
function opcShapes(layout: Layout): LayoutShape[] {
  if (!layout.opc.serifs && !layout.opc.hammerheads) return [];

  const out: LayoutShape[] = [];
  for (const gate of layout.shapes.filter(isPoly)) {
    const serif = Math.max(4, gate.w * 0.4);
    if (layout.opc.serifs) {
      const corners: [number, number][] = [
        [gate.x, gate.y],
        [gate.x + gate.w - serif, gate.y],
        [gate.x, gate.y + gate.h - serif],
        [gate.x + gate.w - serif, gate.y + gate.h - serif],
      ];
      corners.forEach(([x, y], i) => {
        out.push({
          kind: "rect",
          id: `${gate.id}-serif-${i}`,
          layer: "opc",
          x: x - serif * 0.5,
          y,
          w: serif,
          h: serif,
        });
      });
    }
    if (layout.opc.hammerheads) {
      const head = gate.w * 0.6;
      out.push(
        {
          kind: "rect",
          id: `${gate.id}-hh-top`,
          layer: "opc",
          x: gate.x - head / 2,
          y: gate.y - head * 0.5,
          w: gate.w + head,
          h: head,
        },
        {
          kind: "rect",
          id: `${gate.id}-hh-bot`,
          layer: "opc",
          x: gate.x - head / 2,
          y: gate.y + gate.h - head * 0.5,
          w: gate.w + head,
          h: head,
        },
      );
    }
  }
  return out;
}

function bounds(shapes: LayoutShape[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    if (shape.kind === "rect") {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.w);
      maxY = Math.max(maxY, shape.y + shape.h);
    } else if (shape.kind === "circle") {
      minX = Math.min(minX, shape.cx - shape.r);
      minY = Math.min(minY, shape.cy - shape.r);
      maxX = Math.max(maxX, shape.cx + shape.r);
      maxY = Math.max(maxY, shape.cy + shape.r);
    } else {
      for (const [x, y] of shape.points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, minY, maxX, maxY };
}

export function layoutToMask(layout: Layout): MaskView {
  const shapes = [...layout.shapes, ...opcShapes(layout)];
  if (shapes.length === 0) {
    return { shapes: [], minX: 0, minY: 0, width: 1, height: 1 };
  }

  const { minX, minY, maxX, maxY } = bounds(shapes);
  const pad = 30;
  return {
    shapes,
    minX: minX - pad,
    minY: minY - pad,
    width: Math.max(1, maxX - minX + pad * 2),
    height: Math.max(1, maxY - minY + pad * 2),
  };
}

/** Tightest gate-to-gate space, the pitch most likely to bridge on print. */
export function gateSpaceNm(layout: Layout): number | null {
  if (layout.provenance.kind === "gds") return null;
  const gates = layout.shapes.filter(isPoly);
  if (gates.length < 2) return null;

  let min = Infinity;
  for (let i = 0; i < gates.length; i++) {
    for (let j = i + 1; j < gates.length; j++) {
      const a = gates[i];
      const b = gates[j];
      const overlapsVertically = a.y < b.y + b.h && b.y < a.y + a.h;
      if (!overlapsVertically) continue;
      const gap = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
      if (gap >= 0) min = Math.min(min, gap);
    }
  }
  return Number.isFinite(min) ? min : null;
}

/** Aspect ratios xAI Imagine accepts, so the print can match the mask's shape. */
const SUPPORTED_ASPECTS: [number, number][] = [
  [1, 2],
  [9, 16],
  [2, 3],
  [3, 4],
  [1, 1],
  [4, 3],
  [3, 2],
  [16, 9],
  [2, 1],
];

export function closestAspectRatio(widthNm: number, heightNm: number): `${number}:${number}` {
  if (widthNm <= 0 || heightNm <= 0) return "1:1";
  const target = widthNm / heightNm;
  const best = SUPPORTED_ASPECTS.reduce((a, b) =>
    Math.abs(a[0] / a[1] - target) <= Math.abs(b[0] / b[1] - target) ? a : b,
  );
  return `${best[0]}:${best[1]}`;
}

/** Half of the tightest gate pitch: the dimension the scanner has to resolve. */
export function gateHalfPitchNm(layout: Layout): number | null {
  if (layout.provenance.kind === "gds") {
    return layout.provenance.nominalHalfPitchNm;
  }
  const gates = layout.shapes.filter(isPoly);
  if (gates.length < 2) return null;

  let minPitch = Infinity;
  for (let i = 0; i < gates.length; i++) {
    for (let j = i + 1; j < gates.length; j++) {
      const a = gates[i];
      const b = gates[j];
      if (!(a.y < b.y + b.h && b.y < a.y + a.h)) continue;
      const pitch = Math.abs(a.x + a.w / 2 - (b.x + b.w / 2));
      if (pitch > 0) minPitch = Math.min(minPitch, pitch);
    }
  }
  return Number.isFinite(minPitch) ? minPitch / 2 : null;
}

export function layoutStats(layout: Layout): LayoutStats {
  const transistors = layout.cells.reduce((sum, cell) => sum + transistorsIn(cell), 0);
  const cells =
    layout.provenance.kind === "gds" ? layout.provenance.standardCellCount : layout.cells.length;
  const rows =
    layout.provenance.kind === "gds"
      ? layout.provenance.rows
      : new Set(layout.cells.map((cell) => Math.round(cell.y / CELL_H))).size;
  const { minX, minY, maxX, maxY } =
    layout.shapes.length > 0
      ? bounds(layout.shapes)
      : { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  return {
    transistors,
    cells,
    rows,
    widthNm: Math.round(maxX - minX),
    heightNm: Math.round(maxY - minY),
  };
}
