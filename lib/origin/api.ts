import { parseLayout } from "@/lib/layout/parser";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import type { MockOriginPr } from "@/lib/origin/mockPrs";
import { getTicketForPr, type MockTicket } from "@/lib/origin/mockTickets";
import type { LithoParams } from "@/lib/layout/types";

export type SimulationOverrides = Partial<LithoParams>;

function changeTotals(pr: MockOriginPr) {
  return pr.files.reduce(
    (totals, file) => ({
      additions: totals.additions + file.additions,
      deletions: totals.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 },
  );
}

function linksFor(pr: MockOriginPr) {
  return {
    self: `/api/prs/${pr.id}`,
    ticket: `/api/tickets/${pr.ticketId}`,
    ...(pr.rtlAnalysis
      ? {
          rtlSimulation: `/api/prs/${pr.id}/rtl/simulate`,
          rtlExplain: `/api/prs/${pr.id}/rtl/explain`,
        }
      : {}),
    simulate: `/api/prs/${pr.id}/simulate`,
  };
}

export function serializeTicket(ticket: MockTicket) {
  return {
    ...ticket,
    links: {
      self: `/api/tickets/${ticket.id}`,
      pullRequest: `/api/prs/${ticket.linkedPrId}`,
    },
  };
}

export function serializePrSummary(pr: MockOriginPr) {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    repository: pr.repository,
    author: pr.author,
    branch: pr.branch,
    baseBranch: pr.baseBranch,
    updated: pr.updated,
    status: pr.status,
    summary: pr.summary,
    checks: pr.checks,
    changedFiles: pr.files.length,
    changes: changeTotals(pr),
    expectedSimulationOutcome: pr.simulation.expectedOutcome,
    artifact: {
      filename: pr.artifact.filename,
      process: pr.artifact.process,
      ready: true,
    },
    links: linksFor(pr),
  };
}

export function serializePrDetail(pr: MockOriginPr) {
  const payload = loadPrSimulation(pr);
  const layout = parseLayout(payload.recipe);
  const ticket = getTicketForPr(pr.id);

  return {
    ...serializePrSummary(pr),
    files: pr.files,
    artifact: {
      ...pr.artifact,
      ready: true,
    },
    recommendedSimulation: {
      params: payload.params,
      layoutProvenance: layout.provenance.kind,
    },
    ticket: ticket
      ? {
          id: ticket.id,
          key: ticket.key,
          title: ticket.title,
          status: ticket.status,
        }
      : null,
    rtlAnalysis: pr.rtlAnalysis
      ? {
          ready: true,
          expectedOutcome: pr.rtlAnalysis.expectedOutcome,
          fixtureId: pr.rtlAnalysis.fixtureId,
        }
      : null,
  };
}

export function parseSimulationOverrides(
  raw: unknown,
): { overrides: SimulationOverrides } | { error: string } {
  if (raw === undefined) return { overrides: {} };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "JSON body must be an object" };
  }

  const body = raw as Record<string, unknown>;
  if (body.params === undefined) return { overrides: {} };
  if (!body.params || typeof body.params !== "object" || Array.isArray(body.params)) {
    return { error: "params must be an object" };
  }

  const params = body.params as Record<string, unknown>;
  const allowed = new Set<keyof LithoParams>([
    "scanner",
    "illumination",
    "doseMJcm2",
    "focusNm",
    "quality",
  ]);
  const unknown = Object.keys(params).filter(
    (key) => !allowed.has(key as keyof LithoParams),
  );
  if (unknown.length > 0) {
    return { error: `Unknown params: ${unknown.join(", ")}` };
  }

  return { overrides: params as SimulationOverrides };
}
