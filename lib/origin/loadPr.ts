import { LAYOUT_EXAMPLES, type ExampleId } from "@/lib/layout/examples";
import type { LithoParams } from "@/lib/layout/types";
import type { MockOriginPr } from "@/lib/origin/mockPrs";

export type PrSimulationPayload = {
  exampleId: ExampleId;
  recipe: string;
  params: LithoParams;
};

export function loadPrSimulation(pr: MockOriginPr): PrSimulationPayload {
  const example = LAYOUT_EXAMPLES[pr.simulation.exampleId];

  return {
    exampleId: example.id,
    recipe: pr.simulation.recipe ?? example.recipe,
    params: {
      ...example.params,
      ...pr.simulation.params,
    },
  };
}
