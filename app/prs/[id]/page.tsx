import { notFound } from "next/navigation";
import { OriginPrPermalink } from "@/components/OriginPrPermalink";
import { getMockOriginPr } from "@/lib/origin/mockPrs";

export default async function PullRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pullRequest = getMockOriginPr(id);

  if (!pullRequest) notFound();

  return <OriginPrPermalink pullRequest={pullRequest} />;
}
