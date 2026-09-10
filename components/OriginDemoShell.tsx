"use client";

import { useState } from "react";
import { LithoDemo } from "@/components/LithoDemo";
import { OriginPrDetail } from "@/components/OriginPrDetail";
import { OriginPrList } from "@/components/OriginPrList";
import { OriginTicketInbox } from "@/components/OriginTicketInbox";
import { RtlAnalysisPanel } from "@/components/RtlAnalysisPanel";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import {
  getMockOriginPr,
  MOCK_ORIGIN_PRS,
  type MockOriginPr,
} from "@/lib/origin/mockPrs";
import { MOCK_TICKETS, type MockTicket } from "@/lib/origin/mockTickets";

type DemoStage = "tickets" | "list" | "detail" | "rtl" | "simulation";

export function OriginDemoShell() {
  const [stage, setStage] = useState<DemoStage>("tickets");
  const [selectedPr, setSelectedPr] = useState<MockOriginPr | null>(null);
  const [detailReturn, setDetailReturn] = useState<"tickets" | "list">("tickets");

  function selectPullRequest(pr: MockOriginPr) {
    setSelectedPr(pr);
    setDetailReturn("list");
    setStage("detail");
  }

  function selectTicket(ticket: MockTicket) {
    const pullRequest = getMockOriginPr(ticket.linkedPrId);
    if (!pullRequest) return;
    setSelectedPr(pullRequest);
    setDetailReturn("tickets");
    setStage("detail");
  }

  if (stage === "tickets") {
    return (
      <OriginTicketInbox
        tickets={MOCK_TICKETS}
        onSelect={selectTicket}
        onBrowsePullRequests={() => setStage("list")}
      />
    );
  }

  if (stage === "list" || selectedPr === null) {
    return (
      <OriginPrList
        pullRequests={MOCK_ORIGIN_PRS}
        onSelect={selectPullRequest}
        onBackToTickets={() => setStage("tickets")}
      />
    );
  }

  if (stage === "detail") {
    return (
      <OriginPrDetail
        pullRequest={selectedPr}
        onBack={() => setStage(detailReturn)}
        onRun={() => setStage(selectedPr.rtlAnalysis ? "rtl" : "simulation")}
        backLabel={detailReturn === "tickets" ? "Tickets" : "Pull requests"}
      />
    );
  }

  if (stage === "rtl") {
    return <RtlAnalysisPanel pullRequest={selectedPr} onBack={() => setStage("detail")} />;
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
