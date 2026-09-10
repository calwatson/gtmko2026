import type { MockTicket } from "@/lib/origin/mockTickets";

type OriginTicketInboxProps = {
  tickets: MockTicket[];
  onSelect: (ticket: MockTicket) => void;
  onBrowsePullRequests: () => void;
};

function formatStatus(status: MockTicket["status"]): string {
  if (status === "in-review") return "In review";
  if (status === "in-progress") return "In progress";
  return "Backlog";
}

export function OriginTicketInbox({
  tickets,
  onSelect,
  onBrowsePullRequests,
}: OriginTicketInboxProps) {
  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="border-b border-card-04">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-fg text-sm font-semibold text-bg">
              O
            </span>
            <div>
              <p className="text-sm font-medium">Origin</p>
              <p className="text-xs text-fg/45">Hardware engineering workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBrowsePullRequests}
            className="rounded-md bg-card-03 px-3 py-1.5 text-xs text-fg/65 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Browse pull requests
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-7">
          <p className="text-xs tracking-[0.18em] text-accent uppercase">
            asml-labs / litho-accelerator
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Engineering tickets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fg/55">
            Follow a reported hardware issue through the developer PR, deterministic RTL
            verification, generated schematic, and grounded Grok diagnosis.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <section className="overflow-hidden rounded-xl border border-card-04 bg-card">
            <div className="flex items-center justify-between border-b border-card-04 bg-card-01 px-4 py-2.5">
              <span className="text-[11px] tracking-wide text-fg/40 uppercase">Incoming work</span>
              <span className="text-xs text-fg/40">{tickets.length} tickets</span>
            </div>
            {tickets.map((ticket, index) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelect(ticket)}
                className="grid w-full gap-3 border-b border-card-04 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-card-02 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <span
                  className={`grid size-9 place-items-center rounded-lg text-xs font-medium ${
                    index === 0 ? "bg-accent text-white" : "bg-card-04 text-fg/65"
                  }`}
                >
                  {ticket.key.slice(-2)}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-fg/45">{ticket.key}</span>
                    <span className="rounded bg-card-03 px-1.5 py-0.5 text-[10px] text-fg/50">
                      {formatStatus(ticket.status)}
                    </span>
                    {ticket.priority === "high" ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                        High priority
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-fg">{ticket.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-fg/45">{ticket.summary}</span>
                  <span className="mt-2 block text-[11px] text-fg/35">
                    {ticket.assignee} · updated {ticket.updated}
                  </span>
                </span>
                <span className="text-xs font-medium text-accent">Open linked PR →</span>
              </button>
            ))}
          </section>

          <aside className="rounded-xl bg-card p-4">
            <p className="text-xs tracking-[0.15em] text-accent uppercase">Demo path</p>
            <h2 className="mt-2 text-lg font-medium">Catch the bug before tapeout</h2>
            <div className="mt-5 space-y-3">
              {[
                ["1", "Ticket reports incorrect hardware behavior"],
                ["2", "Developer opens a Verilog pull request"],
                ["3", "RTL simulation catches the failing assertion"],
                ["4", "Schematic highlights the exact logic path"],
                ["5", "Grok explains the grounded evidence"],
              ].map(([step, label]) => (
                <div key={step} className="flex gap-3 text-xs leading-5 text-fg/55">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-card-04 text-[10px] text-fg/70">
                    {step}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-card-04 pt-4 text-[11px] leading-4 text-fg/40">
              Tickets, repositories, simulation traces, and synthesis artifacts are mocked for
              this demo. Error localization is deterministic.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
