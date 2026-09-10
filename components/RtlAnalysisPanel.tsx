"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SchematicViewer } from "@/components/SchematicViewer";
import type { MockOriginPr } from "@/lib/origin/mockPrs";
import type {
  RtlFailure,
  RtlTraceSample,
  SchematicEdge,
  SchematicNode,
} from "@/lib/rtl/types";

type RtlSimulationResponse = {
  error?: string;
  code?: string;
  run?: {
    id: string;
    immutable: true;
    permalink: string;
    apiUrl: string;
  } | null;
  ticket: {
    id: string;
    key: string;
    title: string;
  } | null;
  simulation: {
    status: "passed" | "failed";
    simulator: string;
    topModule: string;
    sourcePath: string;
    trace: RtlTraceSample[];
    log: string[];
    failure?: RtlFailure;
  };
  schematic: {
    width: number;
    height: number;
    nodes: SchematicNode[];
    edges: SchematicEdge[];
    highlightNodeIds: string[];
    highlightEdgeIds: string[];
  };
  provenance: {
    fixtureId: string;
    synthesizer: string;
    synthesizedAtRuntime: false;
    label: string;
  };
  explanation?: {
    text: string;
    model: string;
  };
};

type GrokExplanationResponse = {
  explanation?: string;
  model?: string;
  error?: string;
};

export function RtlAnalysisPanel({
  pullRequest,
  onBack,
  savedRunId,
}: {
  pullRequest: MockOriginPr;
  onBack?: () => void;
  savedRunId?: string;
}) {
  const [analysis, setAnalysis] = useState<RtlSimulationResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationModel, setExplanationModel] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let simulationLoaded = false;
      setAnalysisLoading(true);
      setAnalysisError(null);
      setExplanation(null);
      setExplanationError(null);

      try {
        const simulationResponse = await fetch(
          savedRunId
            ? `/api/runs/${savedRunId}`
            : `/api/prs/${pullRequest.id}/rtl/simulate`,
          savedRunId ? undefined : { method: "POST" },
        );
        const simulationData = (await simulationResponse.json()) as RtlSimulationResponse;
        const expectedFailure =
          simulationResponse.status === 422 && simulationData.code === "RTL_ASSERT_FAIL";

        if (!simulationResponse.ok && !expectedFailure) {
          throw new Error(simulationData.error ?? `RTL simulation failed (${simulationResponse.status})`);
        }
        if (cancelled) return;

        setAnalysis(simulationData);
        simulationLoaded = true;
        setAnalysisLoading(false);

        if (savedRunId) {
          setExplanation(simulationData.explanation?.text ?? null);
          setExplanationModel(simulationData.explanation?.model ?? null);
          return;
        }

        setExplanationLoading(true);

        const explanationResponse = await fetch(
          `/api/prs/${pullRequest.id}/rtl/explain`,
          { method: "POST" },
        );
        const explanationData = (await explanationResponse.json()) as GrokExplanationResponse;
        if (!explanationResponse.ok) {
          throw new Error(
            explanationData.error ?? `Grok explanation failed (${explanationResponse.status})`,
          );
        }
        if (cancelled) return;

        setExplanation(explanationData.explanation ?? null);
        setExplanationModel(explanationData.model ?? null);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "RTL analysis failed";
        if (simulationLoaded) {
          setExplanationError(message);
        } else {
          setAnalysisError(message);
        }
      } finally {
        if (!cancelled) {
          setAnalysisLoading(false);
          setExplanationLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [pullRequest.id, savedRunId]);

  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="border-b border-card-04">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-fg/55 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              ← PR #{pullRequest.number}
            </button>
          ) : (
            <Link className="text-xs text-fg/55 hover:text-fg" href="/">
              ← Ticket inbox
            </Link>
          )}
          <p className="text-xs text-fg/40">
            {savedRunId ? "Permanent simulation run" : "RTL verification · CI artifact replay"}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs tracking-[0.16em] text-accent uppercase">
              {analysis?.ticket?.key ?? "Linked ticket"} · PR #{pullRequest.number}
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">
              RTL simulation and schematic diagnosis
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-fg/55">
              Replay the Verilog CI result, locate the failing net in the generated schematic, and
              ground Grok’s explanation in the exact assertion evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {["Ticket received", "PR opened", "RTL simulation", "Tapeout gate"].map(
              (label, index) => (
                <span
                  key={label}
                  className={`rounded-full px-2.5 py-1 ${
                    index === 2
                      ? "bg-accent/15 text-accent"
                      : index === 3
                        ? "bg-card-03 text-fg/35"
                        : "bg-card-03 text-fg/60"
                  }`}
                >
                  {index + 1}. {label}
                </span>
              ),
            )}
          </div>
        </div>

        {analysisLoading ? (
          <section className="rounded-xl bg-card p-8">
            <p className="text-xs tracking-[0.15em] text-accent uppercase">Running CI replay</p>
            <h2 className="mt-2 text-lg font-medium">Compiling Verilog and evaluating assertions…</h2>
            <div className="mt-5 grid gap-2 text-xs text-fg/55 sm:grid-cols-3">
              <span className="rounded-lg bg-card-02 p-3">1. Parse PR source</span>
              <span className="rounded-lg bg-card-02 p-3">2. Replay testbench</span>
              <span className="rounded-lg bg-card-02 p-3">3. Map failure to netlist</span>
            </div>
          </section>
        ) : analysisError ? (
          <section role="alert" className="rounded-xl border border-accent/30 bg-card p-6">
            <p className="text-sm text-accent">{analysisError}</p>
          </section>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
              <section className="rounded-xl bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-[0.15em] text-accent uppercase">
                      Assertion failed at cycle {analysis.simulation.failure?.cycle}
                    </p>
                    <h2 className="mt-1 text-lg font-medium">
                      {analysis.simulation.failure?.message}
                    </h2>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] text-accent">
                    {analysis.code}
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg bg-card-01">
                  <table className="w-full min-w-[680px] text-left text-[11px]">
                    <thead className="text-fg/35">
                      <tr className="border-b border-card-04">
                        {["Cycle", "Reset", "Enable", "Operand", "Expected", "Actual", "Result"].map(
                          (label) => (
                            <th key={label} className="px-3 py-2 font-medium">
                              {label}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.simulation.trace.map((sample) => (
                        <tr
                          key={sample.cycle}
                          className={sample.status === "fail" ? "bg-accent/10" : ""}
                        >
                          <td className="px-3 py-2 text-fg/65">{sample.cycle}</td>
                          <td className="px-3 py-2 text-fg/55">{sample.reset}</td>
                          <td className="px-3 py-2 text-fg/55">{sample.enable}</td>
                          <td className="px-3 py-2 font-mono text-fg/55">
                            {sample.shiftedOperand}
                          </td>
                          <td className="px-3 py-2 font-mono text-fg/55">
                            {sample.expectedAccumulator}
                          </td>
                          <td className="px-3 py-2 font-mono text-fg/75">
                            {sample.actualAccumulator}
                          </td>
                          <td
                            className={`px-3 py-2 ${
                              sample.status === "fail" ? "text-accent" : "text-fg/45"
                            }`}
                          >
                            {sample.status.toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <pre className="mt-3 overflow-x-auto rounded-lg bg-card-02 p-3 font-mono text-[10px] leading-5 text-fg/45">
                  {analysis.simulation.log.join("\n")}
                </pre>
              </section>

              <aside className="flex flex-col gap-4">
                <section className="rounded-xl border border-accent/25 bg-card p-4">
                  <p className="text-xs tracking-[0.15em] text-accent uppercase">
                    Blocked before tapeout
                  </p>
                  <h2 className="mt-2 text-base font-medium">Lithography simulation not started</h2>
                  <p className="mt-2 text-xs leading-5 text-fg/55">
                    The failing RTL assertion must be fixed before synthesis, place-and-route, GDS
                    generation, or wafer exposure can continue.
                  </p>
                </section>

                <section className="flex-1 rounded-xl bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-[0.15em] text-accent uppercase">
                        Grok diagnosis
                      </p>
                      <h2 className="mt-1 text-sm font-medium">Grounded in simulator evidence</h2>
                    </div>
                    {explanationModel ? (
                      <span className="text-[10px] text-fg/35">{explanationModel}</span>
                    ) : null}
                  </div>
                  {explanationLoading ? (
                    <p className="mt-4 text-xs text-fg/45">Grok is explaining the highlighted path…</p>
                  ) : explanationError ? (
                    <p role="alert" className="mt-4 text-xs text-accent">
                      {explanationError}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-fg/70">{explanation}</p>
                  )}
                  <p className="mt-4 border-t border-card-04 pt-3 text-[10px] leading-4 text-fg/35">
                    Grok explains the fixed assertion and node IDs. It does not choose the
                    highlight.
                  </p>
                </section>
              </aside>
            </div>

            <SchematicViewer {...analysis.schematic} />

            <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-xs">
              <span className="text-fg/40">
                {analysis.provenance.label} · {analysis.provenance.synthesizer}
              </span>
              <div className="flex items-center gap-2">
                {analysis.run ? (
                  <Link
                    href={analysis.run.permalink}
                    className="rounded-md bg-accent px-3 py-1.5 font-medium text-white"
                  >
                    Permanent link
                  </Link>
                ) : null}
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-md bg-card-03 px-3 py-1.5 text-fg/70 hover:text-fg"
                  >
                    Return to PR
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="rounded-md bg-card-03 px-3 py-1.5 text-fg/70 hover:text-fg"
                  >
                    Ticket inbox
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
