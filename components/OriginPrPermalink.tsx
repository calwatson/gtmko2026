"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LithoDemo } from "@/components/LithoDemo";
import { OriginPrDetail } from "@/components/OriginPrDetail";
import { RtlAnalysisPanel } from "@/components/RtlAnalysisPanel";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import type { MockOriginPr } from "@/lib/origin/mockPrs";

type PrStage = "detail" | "rtl" | "simulation";

export function OriginPrPermalink({
  pullRequest,
}: {
  pullRequest: MockOriginPr;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<PrStage>("detail");

  if (stage === "detail") {
    return (
      <OriginPrDetail
        pullRequest={pullRequest}
        onBack={() => router.push("/")}
        onRun={() => setStage(pullRequest.rtlAnalysis ? "rtl" : "simulation")}
        backLabel="Ticket inbox"
      />
    );
  }

  if (stage === "rtl") {
    return (
      <RtlAnalysisPanel
        pullRequest={pullRequest}
        onBack={() => setStage("detail")}
      />
    );
  }

  return (
    <LithoDemo
      initialPayload={loadPrSimulation(pullRequest)}
      pullRequest={pullRequest}
      onBack={() => setStage("detail")}
    />
  );
}
