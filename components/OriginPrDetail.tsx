import { MaskPreview } from "@/components/MaskPreview";
import { parseLayout } from "@/lib/layout/parser";
import { loadPrSimulation } from "@/lib/origin/loadPr";
import type { MockOriginPr } from "@/lib/origin/mockPrs";
import { getTicketForPr } from "@/lib/origin/mockTickets";

type OriginPrDetailProps = {
  pullRequest: MockOriginPr;
  onBack: () => void;
  onRun: () => void;
  backLabel?: string;
};

function patchLineClass(line: string): string {
  if (line.startsWith("+")) return "bg-accent/10 text-fg/85";
  if (line.startsWith("-")) return "bg-card-04 text-fg/55";
  if (line.startsWith("@@")) return "bg-card-02 text-accent";
  return "text-fg/55";
}

export function OriginPrDetail({
  pullRequest,
  onBack,
  onRun,
  backLabel = "Pull requests",
}: OriginPrDetailProps) {
  const payload = loadPrSimulation(pullRequest);
  const layout = parseLayout(payload.recipe);
  const ticket = getTicketForPr(pullRequest.id);
  const additions = pullRequest.files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = pullRequest.files.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="border-b border-card-04">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-fg/55 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            ← {backLabel}
          </button>
          <p className="truncate text-xs text-fg/40">{pullRequest.repository}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-card-03 px-2.5 py-1 text-[11px] text-fg/60">
                PR #{pullRequest.number}
              </span>
              <span className="rounded-full bg-card-03 px-2.5 py-1 text-[11px] text-fg/60">
                {pullRequest.status === "draft" ? "Draft" : "Open"}
              </span>
              <span className="text-[11px] text-fg/40">
                {pullRequest.checks.passed}/{pullRequest.checks.total} checks passing
              </span>
              {pullRequest.simulation.expectedOutcome === "defective" ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] text-accent">
                  Intentional defect excursion
                </span>
              ) : null}
              {pullRequest.rtlAnalysis?.expectedOutcome === "fail" ? (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] text-accent">
                  RTL check required
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-2xl font-medium tracking-tight">{pullRequest.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-fg/55">{pullRequest.summary}</p>
            <p className="mt-2 text-xs text-fg/40">
              {pullRequest.author} wants to merge{" "}
              <code className="text-fg/65">{pullRequest.branch}</code> into{" "}
              <code className="text-fg/65">{pullRequest.baseBranch}</code>
            </p>
            {ticket ? (
              <div className="mt-3 flex max-w-3xl items-start gap-3 rounded-lg bg-card px-3 py-2.5">
                <span className="rounded bg-card-04 px-2 py-1 font-mono text-[10px] text-fg/55">
                  {ticket.key}
                </span>
                <div>
                  <p className="text-xs font-medium text-fg/75">{ticket.title}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-fg/40">{ticket.actualBehavior}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <span className="text-fg/45">+{additions}</span>
            <span className="text-fg/35">−{deletions}</span>
            <button
              type="button"
              onClick={onRun}
              className="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {pullRequest.rtlAnalysis ? "Run RTL simulation" : "Run lithography simulation"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <section className="min-w-0 overflow-hidden rounded-xl bg-card">
            <div className="flex items-center justify-between border-b border-card-04 px-4 py-3">
              <div>
                <h2 className="text-sm font-medium">Files changed</h2>
                <p className="mt-0.5 text-[11px] text-fg/40">
                  Mock PR source at the commit that produced the artifact
                </p>
              </div>
              <span className="text-xs text-fg/40">{pullRequest.files.length} files</span>
            </div>

            <div className="space-y-4 p-3">
              {pullRequest.files.map((file) => (
                <article key={file.path} className="overflow-hidden rounded-lg bg-card-01">
                  <header className="flex items-center justify-between border-b border-card-04 px-3 py-2">
                    <code className="truncate text-xs text-fg/75">{file.path}</code>
                    <span className="ml-3 shrink-0 text-[11px] text-fg/40">
                      +{file.additions} −{file.deletions}
                    </span>
                  </header>
                  <pre className="overflow-x-auto py-2 text-[11px] leading-5">
                    {file.patch.split("\n").map((line, index) => (
                      <code
                        key={`${file.path}-${index}`}
                        className={`block min-w-max px-3 ${patchLineClass(line)}`}
                      >
                        {line || " "}
                      </code>
                    ))}
                  </pre>
                </article>
              ))}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            {pullRequest.rtlAnalysis ? (
              <section className="rounded-xl bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs tracking-[0.15em] text-accent uppercase">
                      RTL verification
                    </p>
                    <h2 className="mt-1 text-sm font-medium">CI replay ready</h2>
                  </div>
                  <span className="rounded-full bg-card-03 px-2.5 py-1 text-[11px] text-fg/60">
                    Pending
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  {[
                    ["Verilog source", pullRequest.files[0]?.path ?? "src/spm.sv"],
                    ["Testbench", "tb.spm_pipeline"],
                    ["Schematic", "Precomputed Yosys netlist"],
                    ["GDS generation", "Blocked until RTL passes"],
                  ].map(([label, value], index) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 rounded-lg bg-card-02 px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-fg/55">
                        <span className="grid size-4 place-items-center rounded-full bg-card-04 text-[9px] text-fg/65">
                          {index + 1}
                        </span>
                        {label}
                      </span>
                      <span className="text-right text-fg/40">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] leading-4 text-fg/40">
                  The next step replays a fixed simulator trace and maps its assertion failure to
                  stable node IDs in the generated schematic.
                </p>
              </section>
            ) : (
              <>
                <section className="rounded-xl bg-card p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.15em] text-accent uppercase">
                    CI layout artifact
                  </p>
                  <h2 className="mt-1 font-mono text-sm text-fg">
                    {pullRequest.artifact.filename}
                  </h2>
                </div>
                <span className="rounded-full bg-card-03 px-2.5 py-1 text-[11px] text-fg/65">
                  Ready
                </span>
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2">
                {[
                  ["Build", pullRequest.artifact.buildId],
                  ["Process", pullRequest.artifact.process],
                  ["Geometry", `${pullRequest.artifact.polygonCount.toLocaleString()} polygons`],
                  ["Layers", `${pullRequest.artifact.layerCount} mask layers`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-card-02 px-3 py-2.5">
                    <p className="text-[10px] tracking-wide text-fg/35 uppercase">{label}</p>
                    <p className="mt-1 text-fg/70">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-card-04 pt-4 text-xs">
                {[
                  ["RTL compiled", "Complete"],
                  ["Synthesis + place-and-route", "Mocked"],
                  ["GDS artifact", "Ready to simulate"],
                ].map(([label, value], index) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-fg/60">
                      <span className="grid size-4 place-items-center rounded-full bg-card-04 text-[9px] text-fg/65">
                        {index + 1}
                      </span>
                      {label}
                    </span>
                    <span className="text-fg/40">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-4 text-fg/40">
                {pullRequest.artifact.generator}. This demo artifact represents CI output; it is
                not synthesized from the displayed RTL at runtime.
              </p>
            </section>

                <MaskPreview layout={layout} />
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
