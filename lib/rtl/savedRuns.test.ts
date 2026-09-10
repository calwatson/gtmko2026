import { describe, expect, it } from "vitest";
import {
  getSavedRtlRun,
  getSavedRtlRunForPr,
  SAVED_RTL_RUNS,
  serializeSavedRtlRun,
} from "@/lib/rtl/savedRuns";

describe("saved RTL runs", () => {
  it("uses a stable immutable run id for PR 184", () => {
    const run = getSavedRtlRunForPr("pr-184");

    expect(run?.id).toBe("rtl-run-pr-184-001");
    expect(getSavedRtlRun("rtl-run-pr-184-001")).toBe(run);
    expect(SAVED_RTL_RUNS).toHaveLength(1);
  });

  it("serializes a complete read-only result", () => {
    const run = getSavedRtlRun("rtl-run-pr-184-001");
    expect(run).toBeDefined();
    if (!run) return;

    expect(serializeSavedRtlRun(run)).toMatchObject({
      run: {
        immutable: true,
        permalink: "/runs/rtl-run-pr-184-001",
      },
      pullRequest: { id: "pr-184" },
      ticket: { key: "HW-4821" },
      simulation: { status: "failed" },
      schematic: {
        highlightNodeIds: ["enable_hold_mux", "accumulator_ff"],
      },
    });
  });
});
