import { NextResponse } from "next/server";
import { serializeTicket } from "@/lib/origin/api";
import { MOCK_TICKETS } from "@/lib/origin/mockTickets";

export async function GET() {
  return NextResponse.json({
    tickets: MOCK_TICKETS.map(serializeTicket),
    links: {
      self: "/api/tickets",
    },
  });
}
