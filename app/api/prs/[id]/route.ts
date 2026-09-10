import { NextResponse } from "next/server";
import { serializePrDetail } from "@/lib/origin/api";
import { getMockOriginPr } from "@/lib/origin/mockPrs";

type PrRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: PrRouteContext) {
  const { id } = await context.params;
  const pullRequest = getMockOriginPr(id);

  if (!pullRequest) {
    return NextResponse.json({ error: `Pull request ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({
    pullRequest: serializePrDetail(pullRequest),
  });
}
