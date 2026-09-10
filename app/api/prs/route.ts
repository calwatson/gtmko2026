import { NextResponse } from "next/server";
import { serializePrDetail, serializePrSummary } from "@/lib/origin/api";
import { getMockOriginPr, MOCK_ORIGIN_PRS } from "@/lib/origin/mockPrs";

export async function GET() {
  return NextResponse.json({
    pullRequests: MOCK_ORIGIN_PRS.map(serializePrSummary),
    links: {
      self: "/api/prs",
    },
  });
}

export async function POST() {
  const pullRequest = getMockOriginPr("pr-184");
  if (!pullRequest) {
    return NextResponse.json({ error: "Mock pull request pr-184 is unavailable" }, { status: 500 });
  }

  return NextResponse.json(
    {
      created: true,
      mocked: true,
      message: "Mock pull request #184 created.",
      pullRequest: serializePrDetail(pullRequest),
    },
    {
      status: 201,
      headers: {
        Location: "/api/prs/pr-184",
      },
    },
  );
}
