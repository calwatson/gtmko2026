import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listTickets } from "@/app/api/tickets/route";
import { GET as getTicket } from "@/app/api/tickets/[id]/route";
import { POST as simulateRtl } from "@/app/api/prs/[id]/rtl/simulate/route";
import { POST as explainRtl } from "@/app/api/prs/[id]/rtl/explain/route";
import { GET as getSavedRun } from "@/app/api/runs/[id]/route";
import { explainRtlFailure } from "@/lib/rtl/explain";

vi.mock("@/lib/rtl/explain", () => ({
  explainRtlFailure: vi.fn(async () => ({
    ok: true,
    explanation: "The unconditional accumulator write violates the enable hold behavior.",
    model: "grok-4.6",
    grounding: {
      assertionId: "tb.spm_pipeline.accumulator_holds_when_disabled",
      failingNodeId: "accumulator_ff",
      diffPaths: ["src/spm.sv"],
    },
  })),
}));

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("ticket and RTL web services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists tickets with links to their pull requests", async () => {
    const response = await listTickets();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tickets).toHaveLength(3);
    expect(body.tickets[0]).toMatchObject({
      key: "HW-4821",
      linkedPrId: "pr-184",
      links: {
        self: "/api/tickets/ticket-4821",
        pullRequest: "/api/prs/pr-184",
      },
    });
  });

  it("gets a ticket by id or key", async () => {
    const byId = await getTicket(
      new Request("http://localhost/api/tickets/ticket-4821"),
      context("ticket-4821"),
    );
    const byKey = await getTicket(
      new Request("http://localhost/api/tickets/HW-4821"),
      context("HW-4821"),
    );

    expect((await byId.json()).ticket.key).toBe("HW-4821");
    expect((await byKey.json()).ticket.id).toBe("ticket-4821");
  });

  it("returns the deterministic failure and highlighted schematic", async () => {
    const response = await simulateRtl(
      new Request("http://localhost/api/prs/pr-184/rtl/simulate", { method: "POST" }),
      context("pr-184"),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: "RTL_ASSERT_FAIL",
      simulation: {
        status: "failed",
        failure: {
          assertionId: "tb.spm_pipeline.accumulator_holds_when_disabled",
          failingNodeId: "accumulator_ff",
        },
      },
      schematic: {
        highlightNodeIds: ["enable_hold_mux", "accumulator_ff"],
      },
      run: {
        id: "rtl-run-pr-184-001",
        immutable: true,
        permalink: "/runs/rtl-run-pr-184-001",
      },
      provenance: {
        synthesizedAtRuntime: false,
      },
    });
  });

  it("returns 404 when a PR has no RTL fixture", async () => {
    const response = await simulateRtl(
      new Request("http://localhost/api/prs/pr-179/rtl/simulate", { method: "POST" }),
      context("pr-179"),
    );

    expect(response.status).toBe(404);
  });

  it("serves the immutable run without re-running simulation or Grok", async () => {
    const response = await getSavedRun(
      new Request("http://localhost/api/runs/rtl-run-pr-184-001"),
      context("rtl-run-pr-184-001"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(body).toMatchObject({
      run: {
        id: "rtl-run-pr-184-001",
        immutable: true,
        permalink: "/runs/rtl-run-pr-184-001",
      },
      simulation: {
        status: "failed",
      },
      explanation: {
        model: "grok-4.6",
      },
    });
    expect(explainRtlFailure).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown permanent run", async () => {
    const response = await getSavedRun(
      new Request("http://localhost/api/runs/missing"),
      context("missing"),
    );

    expect(response.status).toBe(404);
  });

  it("returns the grounded Grok explanation", async () => {
    const response = await explainRtl(
      new Request("http://localhost/api/prs/pr-184/rtl/explain", { method: "POST" }),
      context("pr-184"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      model: "grok-4.6",
      grounding: {
        failingNodeId: "accumulator_ff",
      },
    });
    expect(explainRtlFailure).toHaveBeenCalledOnce();
  });
});
