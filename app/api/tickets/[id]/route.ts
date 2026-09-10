import { NextResponse } from "next/server";
import { serializeTicket } from "@/lib/origin/api";
import { getMockTicket } from "@/lib/origin/mockTickets";

type TicketRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: TicketRouteContext) {
  const { id } = await context.params;
  const ticket = getMockTicket(id);

  if (!ticket) {
    return NextResponse.json({ error: `Ticket ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({
    ticket: serializeTicket(ticket),
  });
}
