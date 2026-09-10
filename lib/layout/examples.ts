import type { LithoParams } from "./types";
import { DEFAULT_LITHO, DEFAULT_RECIPE, TINYTAPEOUT_RECIPE } from "./types";

export type ExampleId = "synthetic-5nm" | "tinytapeout-sky130";
export const DEFAULT_EXAMPLE_ID: ExampleId = "tinytapeout-sky130";

export type LayoutExample = {
  id: ExampleId;
  label: string;
  detail: string;
  recipe: string;
  params: LithoParams;
};

export const LAYOUT_EXAMPLES: Record<ExampleId, LayoutExample> = {
  "synthetic-5nm": {
    id: "synthetic-5nm",
    label: "5 nm FinFET test block",
    detail: "Synthetic · advanced-node scanner comparison",
    recipe: DEFAULT_RECIPE,
    params: DEFAULT_LITHO,
  },
  "tinytapeout-sky130": {
    id: "tinytapeout-sky130",
    label: "TinyTapeout SKY130",
    detail: "Authentic GDS · 29 standard-cell instances",
    recipe: TINYTAPEOUT_RECIPE,
    params: {
      scanner: "pas5500750e",
      illumination: "annular",
      doseMJcm2: 50,
      focusNm: 0,
      quality: "low",
    },
  },
};

export const LAYOUT_EXAMPLE_IDS = Object.keys(LAYOUT_EXAMPLES) as ExampleId[];
