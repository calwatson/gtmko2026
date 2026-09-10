import { CPP, FIN_PITCH } from "./cells";
import { layoutStats } from "./geometry";
import type { Layout } from "./types";

export type RecipeDetail = {
  label: string;
  value: string;
};

const LAYER_NAMES: Record<string, string> = {
  nwell: "N-well",
  diffusion: "diffusion",
  "diffusion-n": "N diffusion",
  "diffusion-p": "P diffusion",
  fin: "fins",
  poly: "poly",
  licon: "licon",
  "local-interconnect": "local interconnect",
  mcon: "mcon",
  contact: "contacts",
  metal1: "metal 1",
  via1: "via 1",
  metal2: "metal 2",
  via2: "via 2",
  metal3: "metal 3",
  via: "vias",
  opc: "OPC",
};

function layerList(layout: Layout): string {
  return [...new Set(layout.shapes.map((shape) => LAYER_NAMES[shape.layer]))].join(", ");
}

export function getRecipeDetails(layout: Layout): RecipeDetail[] {
  const stats = layoutStats(layout);

  if (layout.provenance.kind === "gds") {
    const [x1, y1, x2, y2] = layout.provenance.cropUm;
    return [
      { label: "Format", value: "GDSII stream · flattened crop" },
      { label: "PDK", value: `${layout.provenance.pdk} planar CMOS · 130 nm class` },
      { label: "Top cell", value: layout.provenance.sourceCell },
      { label: "Source window", value: `x ${x1}–${x2} µm · y ${y1}–${y2} µm` },
      {
        label: "Geometry",
        value: `${layout.shapes.length.toLocaleString()} polygons · ${new Set(layout.shapes.map((shape) => shape.layer)).size} layers`,
      },
      {
        label: "Placement",
        value: `${stats.cells} standard-cell instances · ${stats.rows} rows`,
      },
      { label: "Layers", value: layerList(layout) },
      {
        label: "Optics assumption",
        value: `${layout.provenance.nominalHalfPitchNm} nm nominal feature`,
      },
      {
        label: "Source revision",
        value: layout.provenance.sourceRevision.slice(0, 12),
      },
    ];
  }

  return [
    { label: "Format", value: "Parametric layout DSL" },
    { label: "Device", value: `${layout.nodeNm ?? 5} nm-class FinFET` },
    {
      label: "Placement",
      value: `${stats.cells} standard cells · ${stats.rows} rows · ${stats.transistors} transistors`,
    },
    { label: "Gate grid", value: `${CPP} nm contacted pitch` },
    { label: "Fin grid", value: `${FIN_PITCH} nm pitch` },
    { label: "Geometry", value: `${layout.shapes.length.toLocaleString()} generated shapes` },
    { label: "Layers", value: layerList(layout) },
  ];
}
