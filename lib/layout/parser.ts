import {
  CELL_H,
  CELL_LIBRARY,
  CELL_TYPES,
  cellWidth,
  expandCell,
  translateShape,
} from "./cells";
import { makeTinyTapeoutShapes, TINYTAPEOUT_PROVENANCE } from "./tinytapeout";
import type {
  Layout,
  LayoutOpc,
  LayoutProvenance,
  LayoutShape,
  ParseError,
  PlacedCell,
} from "./types";

function parseLength(raw: string): number | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)(nm)?$/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseKv(rest: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  const tokens = rest.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq < 1) return null;
    out[token.slice(0, eq)] = token.slice(eq + 1);
  }
  return out;
}

function parseBool(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  if (raw === "on" || raw === "true" || raw === "1") return true;
  if (raw === "off" || raw === "false" || raw === "0") return false;
  return null;
}

function requireId(
  kv: Record<string, string>,
  line: number,
  errors: ParseError[],
): string {
  const id = kv.id;
  if (!id) {
    errors.push({ line, message: "missing id=" });
    return `anon_${line}`;
  }
  return id;
}

function requireLen(
  kv: Record<string, string>,
  key: string,
  line: number,
  errors: ParseError[],
): number {
  const raw = kv[key];
  if (raw === undefined) {
    errors.push({ line, message: `missing ${key}=` });
    return 0;
  }
  const value = parseLength(raw);
  if (value === null) {
    errors.push({ line, message: `invalid ${key}=${raw}` });
    return 0;
  }
  return value;
}

function optionalLen(
  kv: Record<string, string>,
  key: string,
  fallback: number,
  line: number,
  errors: ParseError[],
): number {
  if (kv[key] === undefined) return fallback;
  return requireLen(kv, key, line, errors);
}

/** Rows alternate mirroring so neighbours share a power rail, as in real libraries. */
function rowIsMirrored(y: number): boolean {
  return Math.round(y / CELL_H) % 2 !== 0;
}

function placeCell(
  id: string,
  type: string,
  x: number,
  y: number,
): { cell: PlacedCell; shapes: LayoutShape[] } | null {
  const def = CELL_LIBRARY[type];
  if (!def) return null;
  const cell: PlacedCell = {
    id,
    type,
    label: def.label,
    gates: def.gates,
    x,
    y,
    w: cellWidth(def.gates),
    mirrored: rowIsMirrored(y),
  };
  const shapes = expandCell(cell).map((shape) => translateShape(shape, y));
  return { cell, shapes };
}

export function parseLayout(recipe: string): Layout {
  const errors: ParseError[] = [];
  const shapes: LayoutShape[] = [];
  const cells: PlacedCell[] = [];
  let nodeNm: number | null = null;
  let provenance: LayoutProvenance = {
    kind: "synthetic",
    label: "Synthetic 5 nm FinFET",
    nominalHalfPitchNm: 25,
  };
  const opc: LayoutOpc = { serifs: false, hammerheads: false };
  const ids = new Set<string>();

  const claimId = (id: string, line: number) => {
    if (ids.has(id)) errors.push({ line, message: `duplicate id ${id}` });
    ids.add(id);
  };

  recipe.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const text = raw.replace(/#.*$/, "").trim();
    if (!text) return;

    const [cmd, ...restParts] = text.split(/\s+/);
    const rest = restParts.join(" ");

    if (cmd === "gds") {
      const kv = parseKv(rest);
      if (kv === null || kv.preset !== "tinytapeout-sky130") {
        errors.push({
          line,
          message: "gds expects preset=tinytapeout-sky130",
        });
        return;
      }
      if (shapes.length > 0) {
        errors.push({ line, message: "gds preset cannot be combined with drawn features" });
        return;
      }
      shapes.push(...makeTinyTapeoutShapes());
      nodeNm = 130;
      provenance = TINYTAPEOUT_PROVENANCE;
      return;
    }

    if (cmd === "node") {
      const value = parseLength(restParts[0] ?? "");
      if (value === null || value <= 0) {
        errors.push({ line, message: "node expects a positive length, e.g. 5nm" });
        return;
      }
      nodeNm = value;
      return;
    }

    const kv = parseKv(rest);
    if (kv === null) {
      errors.push({ line, message: "expected key=value pairs" });
      return;
    }

    if (cmd === "row") {
      const id = requireId(kv, line, errors);
      claimId(id, line);
      const y = requireLen(kv, "y", line, errors);
      let x = optionalLen(kv, "x", 0, line, errors);

      const list = (kv.cells ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length === 0) {
        errors.push({ line, message: "row needs cells=, e.g. cells=inv,nand2" });
        return;
      }

      list.forEach((type, i) => {
        const placed = placeCell(`${id}c${i}`, type, x, y);
        if (!placed) {
          errors.push({
            line,
            message: `unknown cell type ${type} (available: ${CELL_TYPES.join(", ")})`,
          });
          return;
        }
        cells.push(placed.cell);
        shapes.push(...placed.shapes);
        x += placed.cell.w;
      });
      return;
    }

    if (cmd === "cell") {
      const id = requireId(kv, line, errors);
      claimId(id, line);
      const type = kv.type ?? "";
      const x = requireLen(kv, "x", line, errors);
      const y = requireLen(kv, "y", line, errors);
      const placed = placeCell(id, type, x, y);
      if (!placed) {
        errors.push({
          line,
          message: `unknown cell type ${type || "(missing type=)"} (available: ${CELL_TYPES.join(", ")})`,
        });
        return;
      }
      cells.push(placed.cell);
      shapes.push(...placed.shapes);
      return;
    }

    if (cmd === "line") {
      const id = requireId(kv, line, errors);
      claimId(id, line);
      shapes.push({
        kind: "rect",
        id,
        layer: "metal1",
        x: requireLen(kv, "x", line, errors),
        y: requireLen(kv, "y", line, errors),
        w: requireLen(kv, "w", line, errors),
        h: requireLen(kv, "l", line, errors),
      });
      return;
    }

    if (cmd === "via") {
      const id = requireId(kv, line, errors);
      claimId(id, line);
      shapes.push({
        kind: "circle",
        id,
        layer: "via",
        cx: requireLen(kv, "x", line, errors),
        cy: requireLen(kv, "y", line, errors),
        r: requireLen(kv, "d", line, errors) / 2,
      });
      return;
    }

    if (cmd === "opc") {
      if (kv.serifs !== undefined) {
        const value = parseBool(kv.serifs);
        if (value === null) errors.push({ line, message: "opc serifs must be on or off" });
        else opc.serifs = value;
      }
      if (kv.hammerheads !== undefined) {
        const value = parseBool(kv.hammerheads);
        if (value === null) errors.push({ line, message: "opc hammerheads must be on or off" });
        else opc.hammerheads = value;
      }
      return;
    }

    errors.push({ line, message: `unknown command ${cmd}` });
  });

  if (shapes.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "recipe places no cells or features" });
  }

  return { nodeNm, shapes, cells, opc, errors, provenance };
}

export function layoutIsValid(layout: Layout): boolean {
  return layout.errors.length === 0 && layout.shapes.length > 0;
}

export function setOpcInRecipe(recipe: string, opc: LayoutOpc): string {
  const line = `opc serifs=${opc.serifs ? "on" : "off"} hammerheads=${opc.hammerheads ? "on" : "off"}`;
  if (/^\s*opc\b/m.test(recipe)) {
    return recipe.replace(/^\s*opc\b.*$/m, line);
  }
  return recipe.replace(/\s*$/, `\n${line}\n`);
}
