import { NextResponse } from "next/server";
import { getMockOriginPr } from "@/lib/origin/mockPrs";
import { explainRtlFailure } from "@/lib/rtl/explain";
import { loadRtlAnalysis } from "@/lib/rtl/loadRtlAnalysis";

export const maxDuration = 30;

type PrRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: PrRouteContext) {
  const { id } = await context.params;
  const pullRequest = getMockOriginPr(id);

  if (!pullRequest) {
    return NextResponse.json({ error: `Pull request ${id} not found` }, { status: 404 });
  }

  const analysis = loadRtlAnalysis(pullRequest);
  if (!analysis) {
    return NextResponse.json(
      { error: `No RTL analysis fixture for pull request ${id}` },
      { status: 404 },
    );
  }

  const result = await explainRtlFailure(pullRequest, analysis);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
