import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";
import type { MockOriginPr } from "@/lib/origin/mockPrs";
import type { RtlAnalysisFixture } from "@/lib/rtl/types";

const MODEL_ID = "grok-4.6";

export type RtlExplanationResult =
  | {
      ok: true;
      explanation: string;
      model: string;
      grounding: {
        assertionId: string;
        failingNodeId: string;
        diffPaths: string[];
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function buildRtlExplanationPrompt(
  pr: MockOriginPr,
  analysis: RtlAnalysisFixture,
): string {
  if (!analysis.failure) return "";

  const diffs = pr.files
    .filter((file) => file.language === "systemverilog")
    .map((file) => `File: ${file.path}\n${file.patch}`)
    .join("\n\n");

  return [
    `Ticket-linked pull request: #${pr.number} ${pr.title}`,
    `Top module: ${analysis.topModule}`,
    `Failed assertion: ${analysis.failure.assertionId}`,
    `Cycle: ${analysis.failure.cycle}`,
    `Expected: ${analysis.failure.expected}`,
    `Actual: ${analysis.failure.actual}`,
    `Simulator finding: ${analysis.failure.message}`,
    `Highlighted schematic node: ${analysis.failure.failingNodeId}`,
    `Deterministic cause: ${analysis.failure.cause}`,
    "Relevant diff:",
    diffs,
    "Explain in three concise sentences: what failed, how the diff caused it, and why the highlighted schematic path is the correct location. Do not propose a different failing node.",
  ].join("\n");
}

export async function explainRtlFailure(
  pr: MockOriginPr,
  analysis: RtlAnalysisFixture,
): Promise<RtlExplanationResult> {
  if (!process.env.XAI_API_KEY) {
    return { ok: false, status: 500, error: "XAI_API_KEY is not set. Add it to .env.local." };
  }
  if (!analysis.failure) {
    return { ok: false, status: 400, error: "RTL analysis contains no failure to explain." };
  }

  try {
    const { text } = await generateText({
      model: xai(MODEL_ID),
      system:
        "You are a digital design verification engineer. Explain only the supplied deterministic simulation evidence. Never move, invent, or second-guess the highlighted node.",
      prompt: buildRtlExplanationPrompt(pr, analysis),
    });

    return {
      ok: true,
      explanation: text,
      model: MODEL_ID,
      grounding: {
        assertionId: analysis.failure.assertionId,
        failingNodeId: analysis.failure.failingNodeId,
        diffPaths: pr.files
          .filter((file) => file.language === "systemverilog")
          .map((file) => file.path),
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Grok explanation request failed",
    };
  }
}
