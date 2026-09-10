import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { MOCK_ORIGIN_PRS } from "@/lib/origin/mockPrs";
import {
  buildRtlExplanationPrompt,
  explainRtlFailure,
} from "@/lib/rtl/explain";
import { loadRtlAnalysis } from "@/lib/rtl/loadRtlAnalysis";

vi.mock("ai", () => ({
  generateText: vi.fn(async () => ({
    text: "The accumulator writes while enable is low because the hold branch was removed.",
  })),
}));

describe("Grok RTL explanation", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.XAI_API_KEY = "test-key";
  });

  it("grounds the prompt in the fixed assertion and highlighted node", () => {
    const pullRequest = MOCK_ORIGIN_PRS[0];
    const analysis = loadRtlAnalysis(pullRequest);
    expect(analysis).toBeDefined();
    if (!analysis) return;

    const prompt = buildRtlExplanationPrompt(pullRequest, analysis);
    expect(prompt).toContain("tb.spm_pipeline.accumulator_holds_when_disabled");
    expect(prompt).toContain("Highlighted schematic node: accumulator_ff");
    expect(prompt).toContain("Expected: 16'h00A5");
    expect(prompt).toContain("else accumulator <= next_sum");
  });

  it("returns a Grok explanation with grounding metadata", async () => {
    const pullRequest = MOCK_ORIGIN_PRS[0];
    const analysis = loadRtlAnalysis(pullRequest);
    expect(analysis).toBeDefined();
    if (!analysis) return;

    const result = await explainRtlFailure(pullRequest, analysis);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.model).toBe("grok-4.6");
    expect(result.grounding).toEqual({
      assertionId: "tb.spm_pipeline.accumulator_holds_when_disabled",
      failingNodeId: "accumulator_ff",
      diffPaths: ["src/spm.sv"],
    });
    expect(generateText).toHaveBeenCalledOnce();
  });

  it("fails closed without an API key", async () => {
    delete process.env.XAI_API_KEY;
    const pullRequest = MOCK_ORIGIN_PRS[0];
    const analysis = loadRtlAnalysis(pullRequest);
    expect(analysis).toBeDefined();
    if (!analysis) return;

    const result = await explainRtlFailure(pullRequest, analysis);
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "XAI_API_KEY is not set. Add it to .env.local.",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns a gateway failure when Grok is unavailable", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error("xAI unavailable"));
    const pullRequest = MOCK_ORIGIN_PRS[0];
    const analysis = loadRtlAnalysis(pullRequest);
    expect(analysis).toBeDefined();
    if (!analysis) return;

    const result = await explainRtlFailure(pullRequest, analysis);
    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "xAI unavailable",
    });
  });
});
