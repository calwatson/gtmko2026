import { TINYTAPEOUT_POLYGONS } from "./tinytapeout-data";
import type { LayoutPolygon, LayoutProvenance } from "./types";

export const TINYTAPEOUT_PROVENANCE: LayoutProvenance = {
  kind: "gds",
  label: "TinyTapeout SKY130 · real GDS",
  pdk: "SKY130",
  sourceUrl: "https://github.com/TinyTapeout/tinytapeout_gds_viewer",
  sourceRevision: "2969b5e7b4004cc35875738ee53fa3043fd6b415",
  license: "Apache-2.0",
  sourceCell: "spm",
  cropUm: [20, 38, 50, 51],
  standardCellCount: 29,
  rows: 3,
  // SKY130's 130 nm-class critical layers are a natural match for the
  // PAS 5500/750E's specified 130 nm production resolution.
  nominalHalfPitchNm: 130,
};

export function makeTinyTapeoutShapes(): LayoutPolygon[] {
  return TINYTAPEOUT_POLYGONS.map(([layer, points], index) => ({
    kind: "polygon",
    id: `tt-${index}`,
    layer,
    points: points.map(([x, y]) => [x, y]),
  }));
}
