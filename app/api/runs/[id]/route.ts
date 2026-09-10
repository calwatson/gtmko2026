import { NextResponse } from "next/server";
import { getSavedRtlRun, serializeSavedRtlRun } from "@/lib/rtl/savedRuns";

type RunRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RunRouteContext) {
  const { id } = await context.params;
  const run = getSavedRtlRun(id);
  const serialized = run ? serializeSavedRtlRun(run) : undefined;

  if (!serialized) {
    return NextResponse.json({ error: `Simulation run ${id} not found` }, { status: 404 });
  }

  return NextResponse.json(serialized, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
