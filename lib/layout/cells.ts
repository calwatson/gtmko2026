import type { LayerId, LayoutShape, PlacedCell } from "./types";

/**
 * Dimensions loosely track a 5nm-class FinFET library. They are chosen so a
 * multi-row block stays legible at screen scale, not to match any real PDK.
 */
export const CPP = 50;
export const CELL_H = 210;
export const POLY_W = 16;
export const RAIL_H = 24;
export const FIN_W = 6;
export const FIN_PITCH = 22;
export const FINS_PER_DEVICE = 3;
export const CONTACT_S = 14;

const DEVICE_H = (FINS_PER_DEVICE - 1) * FIN_PITCH + FIN_W;
const P_BAND_Y = 40;
const N_BAND_Y = 120;
const GATE_TOP = 30;
const GATE_BOT = 180;

export type CellDef = {
  gates: number;
  label: string;
};

export const CELL_LIBRARY: Record<string, CellDef> = {
  inv: { gates: 1, label: "inverter" },
  buf: { gates: 2, label: "buffer" },
  nand2: { gates: 2, label: "2-input NAND" },
  nor2: { gates: 2, label: "2-input NOR" },
  aoi21: { gates: 3, label: "AND-OR-invert" },
  mux2: { gates: 6, label: "2:1 mux" },
  dff: { gates: 12, label: "D flip-flop" },
};

export const CELL_TYPES = Object.keys(CELL_LIBRARY);

export function cellWidth(gates: number): number {
  return gates * CPP;
}

function rect(
  id: string,
  layer: LayerId,
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutShape {
  return { kind: "rect", id, layer, x, y, w, h };
}

/**
 * Each poly gate crossing a diffusion band is one transistor, so a cell with
 * `gates` gates contains 2 * gates devices (one PMOS row, one NMOS row).
 */
export function transistorsIn(cell: Pick<PlacedCell, "gates">): number {
  return cell.gates * 2;
}

export function expandCell(cell: PlacedCell): LayoutShape[] {
  const { id, x, gates } = cell;
  const w = cellWidth(gates);
  const shapes: LayoutShape[] = [];

  shapes.push(rect(`${id}-vdd`, "metal1", x, 0, w, RAIL_H));
  shapes.push(rect(`${id}-vss`, "metal1", x, CELL_H - RAIL_H, w, RAIL_H));

  shapes.push(rect(`${id}-pdiff`, "diffusion-p", x, P_BAND_Y, w, DEVICE_H));
  shapes.push(rect(`${id}-ndiff`, "diffusion-n", x, N_BAND_Y, w, DEVICE_H));

  for (let f = 0; f < FINS_PER_DEVICE; f++) {
    shapes.push(rect(`${id}-pfin${f}`, "fin", x, P_BAND_Y + f * FIN_PITCH, w, FIN_W));
    shapes.push(rect(`${id}-nfin${f}`, "fin", x, N_BAND_Y + f * FIN_PITCH, w, FIN_W));
  }

  for (let g = 0; g < gates; g++) {
    const gx = x + (g + 0.5) * CPP - POLY_W / 2;
    shapes.push(rect(`${id}-poly${g}`, "poly", gx, GATE_TOP, POLY_W, GATE_BOT - GATE_TOP));
  }

  // Source/drain contacts sit between gates; abutted cells share the columns
  // that land on the cell boundary, which is why c runs to gates inclusive.
  const contactY = (bandY: number) => bandY + DEVICE_H / 2 - CONTACT_S / 2;
  for (let c = 0; c <= gates; c++) {
    const cx = x + c * CPP - CONTACT_S / 2;
    shapes.push(rect(`${id}-pcon${c}`, "contact", cx, contactY(P_BAND_Y), CONTACT_S, CONTACT_S));
    shapes.push(rect(`${id}-ncon${c}`, "contact", cx, contactY(N_BAND_Y), CONTACT_S, CONTACT_S));
  }

  shapes.push(rect(`${id}-pin`, "metal1", x + CPP * 0.25, 92, w - CPP * 0.5, 22));

  return cell.mirrored ? shapes.map(mirrorShape) : shapes;
}

function mirrorShape(shape: LayoutShape): LayoutShape {
  if (shape.kind === "circle") {
    return { ...shape, cy: CELL_H - shape.cy };
  }
  if (shape.kind === "polygon") {
    return {
      ...shape,
      points: shape.points.map(([x, y]) => [x, CELL_H - y]),
    };
  }
  return { ...shape, y: CELL_H - (shape.y + shape.h) };
}

export function translateShape(shape: LayoutShape, dy: number): LayoutShape {
  if (shape.kind === "circle") return { ...shape, cy: shape.cy + dy };
  if (shape.kind === "polygon") {
    return { ...shape, points: shape.points.map(([x, y]) => [x, y + dy]) };
  }
  return { ...shape, y: shape.y + dy };
}
