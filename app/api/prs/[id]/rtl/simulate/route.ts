import { NextResponse } from "next/server";
import { getMockOriginPr } from "@/lib/origin/mockPrs";
import { getTicketForPr } from "@/lib/origin/mockTickets";
import { loadRtlAnalysis } from "@/lib/rtl/loadRtlAnalysis";
import { getSavedRtlRunForPr } from "@/lib/rtl/savedRuns";

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

  const ticket = getTicketForPr(pullRequest.id);
  const savedRun = getSavedRtlRunForPr(pullRequest.id);
  const body = {
    ...(analysis.failure
      ? {
          error: analysis.failure.message,
          code: analysis.failure.code,
        }
      : {}),
    pullRequest: {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
    },
    run: savedRun
      ? {
          id: savedRun.id,
          immutable: true,
          permalink: `/runs/${savedRun.id}`,
          apiUrl: `/api/runs/${savedRun.id}`,
        }
      : null,
    ticket: ticket
      ? {
          id: ticket.id,
          key: ticket.key,
          title: ticket.title,
        }
      : null,
    simulation: {
      status: analysis.status,
      simulator: analysis.simulator,
      topModule: analysis.topModule,
      sourcePath: analysis.sourcePath,
      trace: analysis.trace,
      log: analysis.log,
      failure: analysis.failure,
    },
    schematic: analysis.schematic,
    provenance: {
      fixtureId: analysis.id,
      synthesizer: analysis.synthesizer,
      synthesizedAtRuntime: analysis.synthesizedAtRuntime,
      label: "Precomputed CI artifact replay",
    },
    links: {
      pullRequest: `/api/prs/${pullRequest.id}`,
      explain: `/api/prs/${pullRequest.id}/rtl/explain`,
      ...(savedRun ? { permalink: `/runs/${savedRun.id}` } : {}),
    },
  };

  return NextResponse.json(body, { status: analysis.status === "failed" ? 422 : 200 });
}
