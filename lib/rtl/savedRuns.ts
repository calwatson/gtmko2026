import { getMockOriginPr } from "@/lib/origin/mockPrs";
import { getMockTicket } from "@/lib/origin/mockTickets";
import { getRtlAnalysisFixture } from "@/lib/rtl/loadRtlAnalysis";

export type SavedRtlRun = {
  id: string;
  prId: string;
  ticketId: string;
  fixtureId: string;
  createdAt: string;
  explanation: {
    text: string;
    model: string;
  };
};

export const SAVED_RTL_RUNS: SavedRtlRun[] = [
  {
    id: "rtl-run-pr-184-001",
    prId: "pr-184",
    ticketId: "ticket-4821",
    fixtureId: "rtl-pr-184-v1",
    createdAt: "2026-09-10T09:45:00.000Z",
    explanation: {
      model: "grok-4.6",
      text: "The accumulator hold assertion fails because the new sequential branch writes next_sum on every non-reset clock, including cycles where enable is low. At cycle 35 that unconditional write advances the value from 16'h00A5 to 16'h014A. The highlighted enable_hold_mux and accumulator_ff path is the exact logic path that lost the enable gate.",
    },
  },
];

export function getSavedRtlRun(id: string): SavedRtlRun | undefined {
  return SAVED_RTL_RUNS.find((run) => run.id === id);
}

export function getSavedRtlRunForPr(prId: string): SavedRtlRun | undefined {
  return SAVED_RTL_RUNS.find((run) => run.prId === prId);
}

export function serializeSavedRtlRun(run: SavedRtlRun) {
  const pullRequest = getMockOriginPr(run.prId);
  const ticket = getMockTicket(run.ticketId);
  const analysis = getRtlAnalysisFixture(run.fixtureId);
  if (!pullRequest || !ticket || !analysis) return undefined;

  return {
    run: {
      id: run.id,
      createdAt: run.createdAt,
      immutable: true,
      permalink: `/runs/${run.id}`,
      apiUrl: `/api/runs/${run.id}`,
    },
    code: analysis.failure?.code,
    error: analysis.failure?.message,
    pullRequest: {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
    },
    ticket: {
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
    },
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
      label: "Immutable CI artifact replay",
    },
    explanation: run.explanation,
    links: {
      self: `/api/runs/${run.id}`,
      permalink: `/runs/${run.id}`,
      pullRequest: `/api/prs/${pullRequest.id}`,
    },
  };
}
