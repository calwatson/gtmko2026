import { describe, expect, it } from "vitest";
import { MOCK_ORIGIN_PRS } from "@/lib/origin/mockPrs";
import { loadRtlAnalysis } from "@/lib/rtl/loadRtlAnalysis";

describe("RTL analysis fixtures", () => {
  it("maps every highlighted node and edge to the generated schematic", () => {
    const analysis = loadRtlAnalysis(MOCK_ORIGIN_PRS[0]);
    expect(analysis).toBeDefined();
    if (!analysis) return;

    const nodeIds = new Set(analysis.schematic.nodes.map((node) => node.id));
    const edgeIds = new Set(analysis.schematic.edges.map((edge) => edge.id));

    for (const id of analysis.schematic.highlightNodeIds) {
      expect(nodeIds.has(id), id).toBe(true);
    }
    for (const id of analysis.schematic.highlightEdgeIds) {
      expect(edgeIds.has(id), id).toBe(true);
    }
    expect(nodeIds.has(analysis.failure?.failingNodeId ?? "")).toBe(true);
  });

  it("keeps the failure trace consistent with the assertion", () => {
    const analysis = loadRtlAnalysis(MOCK_ORIGIN_PRS[0]);
    const failedSample = analysis?.trace.find((sample) => sample.status === "fail");

    expect(failedSample?.cycle).toBe(analysis?.failure?.cycle);
    expect(failedSample?.expectedAccumulator).toBe(analysis?.failure?.expected);
    expect(failedSample?.actualAccumulator).toBe(analysis?.failure?.actual);
  });

  it("does not invent RTL analysis for unrelated PRs", () => {
    expect(loadRtlAnalysis(MOCK_ORIGIN_PRS[1])).toBeUndefined();
    expect(loadRtlAnalysis(MOCK_ORIGIN_PRS[2])).toBeUndefined();
  });
});
