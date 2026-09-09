"use client";

import { useState } from "react";
import { LithoDemo } from "@/components/LithoDemo";
import { OriginPrDetail } from "@/components/OriginPrDetail";
import { OriginPrList } from "@/components/OriginPrList";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import { MOCK_ORIGIN_PRS, type MockOriginPr } from "@/lib/origin/mockPrs";

type DemoStage = "list" | "detail" | "simulation";

export function OriginDemoShell() {
  const [stage, setStage] = useState<DemoStage>("list");
  const [selectedPr, setSelectedPr] = useState<MockOriginPr | null>(null);

  function selectPullRequest(pr: MockOriginPr) {
    setSelectedPr(pr);
    setStage("detail");
  }

  if (stage === "list" || selectedPr === null) {
    return <OriginPrList pullRequests={MOCK_ORIGIN_PRS} onSelect={selectPullRequest} />;
  }

  if (stage === "detail") {
    return (
      <OriginPrDetail
        pullRequest={selectedPr}
        onBack={() => setStage("list")}
        onRun={() => setStage("simulation")}
      />
    );
  }

  return (
    <LithoDemo
      key={selectedPr.id}
      initialPayload={loadPrSimulation(selectedPr)}
      pullRequest={selectedPr}
      onBack={() => setStage("detail")}
    />
  );
}
