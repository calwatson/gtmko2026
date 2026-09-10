import { notFound } from "next/navigation";
import { RtlAnalysisPanel } from "@/components/RtlAnalysisPanel";
import { getMockOriginPr } from "@/lib/origin/mockPrs";
import { getSavedRtlRun } from "@/lib/rtl/savedRuns";

export default async function SavedRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getSavedRtlRun(id);
  const pullRequest = run ? getMockOriginPr(run.prId) : undefined;

  if (!run || !pullRequest) notFound();

  return <RtlAnalysisPanel pullRequest={pullRequest} savedRunId={run.id} />;
}
