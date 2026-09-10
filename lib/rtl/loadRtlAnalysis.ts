import type { MockOriginPr } from "@/lib/origin/mockPrs";
import { RTL_ANALYSIS_FIXTURES } from "@/lib/rtl/fixtures";
import type { RtlAnalysisFixture } from "@/lib/rtl/types";

export function getRtlAnalysisFixture(id: string): RtlAnalysisFixture | undefined {
  return RTL_ANALYSIS_FIXTURES[id];
}

export function loadRtlAnalysis(pr: MockOriginPr): RtlAnalysisFixture | undefined {
  if (!pr.rtlAnalysis) return undefined;

  const fixture = getRtlAnalysisFixture(pr.rtlAnalysis.fixtureId);
  if (!fixture || fixture.prId !== pr.id) return undefined;

  return fixture;
}
