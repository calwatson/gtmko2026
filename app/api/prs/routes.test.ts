import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as listPullRequests,
  POST as createPullRequest,
} from "@/app/api/prs/route";
import { GET as getPullRequest } from "@/app/api/prs/[id]/route";
import { POST as simulatePullRequest } from "@/app/api/prs/[id]/simulate/route";
import { runImagine } from "@/lib/imagine/runImagine";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import { MOCK_ORIGIN_PRS } from "@/lib/origin/mockPrs";

vi.mock("@/lib/imagine/runImagine", () => ({
  runImagine: vi.fn(async () => ({
    ok: true,
    imageDataUrl: "data:image/png;base64,ZmFrZQ==",
    prompt: "mock prompt",
  })),
}));

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PR web services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists bot-friendly PR summaries with discoverable links", async () => {
    const response = await listPullRequests();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pullRequests).toHaveLength(3);
    expect(body.pullRequests[0]).toMatchObject({
      id: "pr-184",
      changedFiles: 1,
      expectedSimulationOutcome: "nominal",
      links: {
        self: "/api/prs/pr-184",
        permalink: "/prs/pr-184",
        ticket: "/api/tickets/ticket-4821",
        rtlSimulation: "/api/prs/pr-184/rtl/simulate",
        rtlExplain: "/api/prs/pr-184/rtl/explain",
        simulate: "/api/prs/pr-184/simulate",
      },
    });
    expect(body.pullRequests[0]).not.toHaveProperty("files");
  });

  it("always creates the mocked PR 184", async () => {
    const firstResponse = await createPullRequest();
    const secondResponse = await createPullRequest();
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.headers.get("Location")).toBe("/api/prs/pr-184");
    expect(firstBody).toMatchObject({
      created: true,
      mocked: true,
      pullRequest: {
        id: "pr-184",
        number: 184,
        ticket: { key: "HW-4821" },
      },
    });
    expect(secondBody.pullRequest.id).toBe("pr-184");
  });

  it("returns PR diffs, artifact metadata, and recommended settings", async () => {
    const response = await getPullRequest(
      new Request("http://localhost/api/prs/pr-179"),
      context("pr-179"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pullRequest.files[0].path).toBe("rtl/edge_filter.sv");
    expect(body.pullRequest.artifact.filename).toBe("edge_filter_pr179.gds");
    expect(body.pullRequest.recommendedSimulation.params.scanner).toBe("exe5200");
  });

  it("returns 404 for an unknown PR", async () => {
    const response = await getPullRequest(
      new Request("http://localhost/api/prs/pr-999"),
      context("pr-999"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Pull request pr-999 not found" });
  });

  it("simulates the selected PR with optional scanner overrides", async () => {
    const request = new Request("http://localhost/api/prs/pr-179/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        params: {
          scanner: "nxe3800e",
          doseMJcm2: 48,
        },
      }),
    });
    const response = await simulatePullRequest(request, context("pr-179"));
    const body = await response.json();
    const expected = loadPrSimulation(MOCK_ORIGIN_PRS[1]);

    expect(response.status).toBe(200);
    expect(runImagine).toHaveBeenCalledWith({
      recipe: expected.recipe,
      params: {
        ...expected.params,
        scanner: "nxe3800e",
        doseMJcm2: 48,
      },
    });
    expect(body).toMatchObject({
      pullRequest: { id: "pr-179", number: 179 },
      simulation: {
        imageDataUrl: "data:image/png;base64,ZmFrZQ==",
        prompt: "mock prompt",
      },
    });
  });

  it("blocks PR 184 from lithography when RTL verification fails", async () => {
    const request = new Request("http://localhost/api/prs/pr-184/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const response = await simulatePullRequest(request, context("pr-184"));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "RTL_ASSERT_FAIL",
      pullRequest: { id: "pr-184", number: 184 },
      links: {
        rtlSimulation: "/api/prs/pr-184/rtl/simulate",
      },
    });
    expect(runImagine).not.toHaveBeenCalled();
  });

  it("rejects malformed overrides before running the simulation", async () => {
    const request = new Request("http://localhost/api/prs/pr-184/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: { unsupported: true } }),
    });
    const response = await simulatePullRequest(request, context("pr-184"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown params: unsupported" });
    expect(runImagine).not.toHaveBeenCalled();
  });
});
