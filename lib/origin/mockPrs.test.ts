import { describe, expect, it } from "vitest";
import { parseLayout } from "@/lib/layout/parser";
import { ILLUMINATIONS, SCANNERS } from "@/lib/litho/optics";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import { getMockOriginPr, MOCK_ORIGIN_PRS } from "@/lib/origin/mockPrs";

describe("mock Origin pull requests", () => {
  it("provides distinct PRs with review and artifact metadata", () => {
    expect(MOCK_ORIGIN_PRS).toHaveLength(3);
    expect(new Set(MOCK_ORIGIN_PRS.map((pr) => pr.id)).size).toBe(MOCK_ORIGIN_PRS.length);

    for (const pr of MOCK_ORIGIN_PRS) {
      expect(pr.files.length).toBeGreaterThan(0);
      expect(pr.artifact.filename).toMatch(/\.gds$/);
      expect(pr.checks.passed).toBeLessThanOrEqual(pr.checks.total);
      expect(getMockOriginPr(pr.id)).toBe(pr);
    }
  });

  it("resolves every PR into a valid simulation payload", () => {
    for (const pr of MOCK_ORIGIN_PRS) {
      const payload = loadPrSimulation(pr);
      const layout = parseLayout(payload.recipe);

      expect(layout.errors, pr.id).toEqual([]);
      expect(SCANNERS[payload.params.scanner], pr.id).toBeDefined();
      expect(ILLUMINATIONS[payload.params.illumination], pr.id).toBeDefined();
    }
  });

  it("keeps the TinyTapeout artifact separate from mocked synthetic layouts", () => {
    const [tinyTapeoutPr, ...syntheticPrs] = MOCK_ORIGIN_PRS;

    expect(parseLayout(loadPrSimulation(tinyTapeoutPr).recipe).provenance.kind).toBe("gds");
    for (const pr of syntheticPrs) {
      expect(parseLayout(loadPrSimulation(pr).recipe).provenance.kind).toBe("synthetic");
    }
  });
});
