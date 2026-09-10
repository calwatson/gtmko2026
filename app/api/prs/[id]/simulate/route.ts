import { NextResponse } from "next/server";
import { runImagine } from "@/lib/imagine/runImagine";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import { parseSimulationOverrides } from "@/lib/origin/api";
import { getMockOriginPr } from "@/lib/origin/mockPrs";

export const maxDuration = 60;

type PrRouteContext = {
  params: Promise<{ id: string }>;
};

async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim().length === 0) return undefined;
  return JSON.parse(text) as unknown;
}

export async function POST(request: Request, context: PrRouteContext) {
  const { id } = await context.params;
  const pullRequest = getMockOriginPr(id);

  if (!pullRequest) {
    return NextResponse.json({ error: `Pull request ${id} not found` }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await readOptionalJson(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseSimulationOverrides(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = loadPrSimulation(pullRequest);
  const params = {
    ...payload.params,
    ...parsed.overrides,
  };

  if (pullRequest.rtlAnalysis?.expectedOutcome === "fail") {
    return NextResponse.json(
      {
        error: `Lithography blocked for PR #${pullRequest.number}: RTL verification failed.`,
        code: "RTL_ASSERT_FAIL",
        pullRequest: {
          id: pullRequest.id,
          number: pullRequest.number,
          title: pullRequest.title,
        },
        links: {
          rtlSimulation: `/api/prs/${pullRequest.id}/rtl/simulate`,
          rtlExplain: `/api/prs/${pullRequest.id}/rtl/explain`,
        },
      },
      { status: 409 },
    );
  }

  const result = await runImagine({
    recipe: payload.recipe,
    params,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, parseErrors: result.parseErrors },
      { status: result.status },
    );
  }

  if (pullRequest.simulation.expectedOutcome === "defective") {
    return NextResponse.json(
      {
        error: `Simulation detected a process-window failure for PR #${pullRequest.number}.`,
        code: "PROCESS_WINDOW_COLLAPSED",
        pullRequest: {
          id: pullRequest.id,
          number: pullRequest.number,
          title: pullRequest.title,
        },
        artifact: pullRequest.artifact,
        simulation: {
          expectedOutcome: pullRequest.simulation.expectedOutcome,
          stage: "post-exposure-inspection",
          params,
          imageDataUrl: result.imageDataUrl,
          prompt: result.prompt,
        },
        failure: {
          causes: [
            "EUV photon dose is below the stable imaging threshold.",
            "Focus offset is outside the scanner depth-of-focus budget.",
          ],
        },
        links: {
          pullRequest: `/api/prs/${pullRequest.id}`,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    pullRequest: {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
    },
    artifact: pullRequest.artifact,
    simulation: {
      expectedOutcome: pullRequest.simulation.expectedOutcome,
      params,
      imageDataUrl: result.imageDataUrl,
      prompt: result.prompt,
    },
    links: {
      pullRequest: `/api/prs/${pullRequest.id}`,
    },
  });
}
