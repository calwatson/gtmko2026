export type MockTicket = {
  id: string;
  key: string;
  title: string;
  status: "in-progress" | "in-review" | "backlog";
  priority: "high" | "medium";
  reporter: string;
  assignee: string;
  updated: string;
  summary: string;
  expectedBehavior: string;
  actualBehavior: string;
  linkedPrId: string;
};

export const MOCK_TICKETS: MockTicket[] = [
  {
    id: "ticket-4821",
    key: "HW-4821",
    title: "SPM accumulator changes while enable is low",
    status: "in-review",
    priority: "high",
    reporter: "Elena Vos",
    assignee: "Maya Chen",
    updated: "8 min ago",
    summary:
      "The serial-parallel multiplier returns twice the expected product after the new pipeline stage stalls.",
    expectedBehavior: "Accumulator holds 16'h00A5 while enable is low.",
    actualBehavior: "Accumulator advances to 16'h014A on the next clock.",
    linkedPrId: "pr-184",
  },
  {
    id: "ticket-4796",
    key: "HW-4796",
    title: "Increase edge-filter throughput to two pixels per cycle",
    status: "in-progress",
    priority: "medium",
    reporter: "Samir Patel",
    assignee: "Jon Bell",
    updated: "39 min ago",
    summary: "Add a second MAC lane and rebalance the output stage for the inspection pipeline.",
    expectedBehavior: "Process two independent pixel windows each cycle.",
    actualBehavior: "Current RTL accepts one window per cycle.",
    linkedPrId: "pr-179",
  },
  {
    id: "ticket-4772",
    key: "HW-4772",
    title: "Reduce scan-enable fanout before sign-off",
    status: "backlog",
    priority: "medium",
    reporter: "Iris de Boer",
    assignee: "Priya Nair",
    updated: "2 hr ago",
    summary: "Balance the register-bank scan-enable path before the next timing review.",
    expectedBehavior: "Scan-enable fanout remains below the sign-off limit.",
    actualBehavior: "The control net exceeds the target fanout in the current netlist.",
    linkedPrId: "pr-172",
  },
];

export function getMockTicket(id: string): MockTicket | undefined {
  return MOCK_TICKETS.find((ticket) => ticket.id === id || ticket.key === id);
}

export function getTicketForPr(prId: string): MockTicket | undefined {
  return MOCK_TICKETS.find((ticket) => ticket.linkedPrId === prId);
}
