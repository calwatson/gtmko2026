import type { MockOriginPr } from "@/lib/origin/mockPrs";

type OriginPrListProps = {
  pullRequests: MockOriginPr[];
  onSelect: (pr: MockOriginPr) => void;
  onBackToTickets?: () => void;
};

function OriginMark() {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-fg text-sm font-semibold text-bg">
      O
    </span>
  );
}

export function OriginPrList({
  pullRequests,
  onSelect,
  onBackToTickets,
}: OriginPrListProps) {
  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="border-b border-card-04">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <OriginMark />
            <div>
              <p className="text-sm font-medium">Origin</p>
              <p className="text-xs text-fg/45">Mock code review workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onBackToTickets ? (
              <button
                type="button"
                onClick={onBackToTickets}
                className="rounded-md px-3 py-1 text-xs text-fg/55 hover:text-fg"
              >
                Tickets
              </button>
            ) : null}
            <span className="rounded-full bg-card-03 px-3 py-1 text-xs text-fg/60">
              Demo data
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs tracking-[0.18em] text-accent uppercase">
              asml-labs / litho-accelerator
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">Pull requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-fg/55">
              Load a code change, inspect its mocked place-and-route artifact, then simulate how
              the selected scanner would image it.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg/55">
            <span className="rounded-md bg-card-03 px-2.5 py-1.5">
              {pullRequests.length} open
            </span>
            <span className="rounded-md px-2.5 py-1.5">0 merged</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-card-04 bg-card">
          <div className="grid grid-cols-[1fr_auto] border-b border-card-04 bg-card-01 px-4 py-2.5 text-[11px] tracking-wide text-fg/40 uppercase">
            <span>Change</span>
            <span className="hidden sm:block">Checks</span>
          </div>
          {pullRequests.map((pr) => {
            const additions = pr.files.reduce((sum, file) => sum + file.additions, 0);
            const deletions = pr.files.reduce((sum, file) => sum + file.deletions, 0);
            const checksComplete = pr.checks.passed === pr.checks.total;

            return (
              <button
                key={pr.id}
                type="button"
                onClick={() => onSelect(pr)}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-card-04 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-card-02 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="grid size-9 place-items-center rounded-full bg-card-04 text-xs font-medium text-fg/75">
                  {pr.authorInitials}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-fg">{pr.title}</span>
                    {pr.status === "draft" ? (
                      <span className="rounded bg-card-04 px-1.5 py-0.5 text-[10px] text-fg/50">
                        Draft
                      </span>
                    ) : null}
                    {pr.simulation.expectedOutcome === "defective" ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                        Defect case
                      </span>
                    ) : null}
                    {pr.rtlAnalysis?.expectedOutcome === "fail" ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                        RTL failure
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-fg/45">
                    #{pr.number} opened by {pr.author} · {pr.updated}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-fg/40">
                    <span>{pr.files.length} changed files</span>
                    <span>+{additions}</span>
                    <span>−{deletions}</span>
                    <span className="font-mono">{pr.branch}</span>
                  </span>
                </span>
                <span className="col-start-2 flex items-center justify-between gap-5 sm:col-start-3">
                  <span className="text-xs text-fg/55">
                    <span
                      className={`mr-1.5 inline-block size-1.5 rounded-full ${
                        checksComplete ? "bg-fg/60" : "bg-accent"
                      }`}
                    />
                    {pr.checks.passed}/{pr.checks.total}
                  </span>
                  <span className="text-xs font-medium text-accent">Load PR →</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 text-xs text-fg/45 md:grid-cols-3">
          {[
            ["1", "Review RTL diff"],
            ["2", "Load mocked GDS artifact"],
            ["3", "Run scanner simulation"],
          ].map(([step, label]) => (
            <div key={step} className="flex items-center gap-2 rounded-lg bg-card-01 px-3 py-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-card-04 text-[10px] text-fg/65">
                {step}
              </span>
              {label}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
