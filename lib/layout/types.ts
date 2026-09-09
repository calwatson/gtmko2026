import type { IlluminationId, ScannerId } from "@/lib/litho/optics";

export type LayerId =
  | "nwell"
  | "diffusion"
  | "diffusion-n"
  | "diffusion-p"
  | "fin"
  | "poly"
  | "licon"
  | "local-interconnect"
  | "mcon"
  | "contact"
  | "metal1"
  | "via1"
  | "metal2"
  | "via2"
  | "metal3"
  | "via"
  | "opc";

export type LayoutRect = {
  kind: "rect";
  id: string;
  layer: LayerId;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutCircle = {
  kind: "circle";
  id: string;
  layer: LayerId;
  cx: number;
  cy: number;
  r: number;
};

export type LayoutPolygon = {
  kind: "polygon";
  id: string;
  layer: LayerId;
  points: [number, number][];
};

export type LayoutShape = LayoutRect | LayoutCircle | LayoutPolygon;

export type PlacedCell = {
  id: string;
  type: string;
  label: string;
  gates: number;
  x: number;
  y: number;
  w: number;
  mirrored: boolean;
};

export type LayoutOpc = {
  serifs: boolean;
  hammerheads: boolean;
};

export type ParseError = {
  line: number;
  message: string;
};

export type LayoutProvenance =
  | {
      kind: "synthetic";
      label: string;
      nominalHalfPitchNm: number;
    }
  | {
      kind: "gds";
      label: string;
      pdk: "SKY130";
      sourceUrl: string;
      sourceRevision: string;
      license: "Apache-2.0";
      sourceCell: string;
      cropUm: [number, number, number, number];
      standardCellCount: number;
      rows: number;
      nominalHalfPitchNm: number;
    };

export type Layout = {
  nodeNm: number | null;
  shapes: LayoutShape[];
  cells: PlacedCell[];
  opc: LayoutOpc;
  errors: ParseError[];
  provenance: LayoutProvenance;
};

export type LithoParams = {
  scanner: ScannerId;
  illumination: IlluminationId;
  doseMJcm2: number;
  focusNm: number;
  quality: "low" | "medium";
};

export type ImagineRequestBody = {
  recipe: string;
  params: LithoParams;
};

export const DEFAULT_RECIPE = `# 5nm FinFET standard-cell block
node 5nm
row id=r0 y=0 cells=inv,nand2,nor2,inv,dff
row id=r1 y=210 cells=nand2,aoi21,inv,mux2
row id=r2 y=420 cells=dff,inv,nand2,nor2,buf
opc serifs=on hammerheads=off
`;

export const TINYTAPEOUT_RECIPE = `# Authentic SKY130 polygons from TinyTapeout's sample GDS
gds preset=tinytapeout-sky130
`;

export const DEFAULT_LITHO: LithoParams = {
  scanner: "nxe3800e",
  illumination: "dipole",
  doseMJcm2: 40,
  focusNm: 0,
  quality: "low",
};
