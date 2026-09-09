import { NextResponse } from "next/server";
import { runImagine } from "@/lib/imagine/runImagine";

export const maxDuration = 60;

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await runImagine(raw);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, parseErrors: result.parseErrors },
      { status: result.status },
    );
  }

  return NextResponse.json({
    imageDataUrl: result.imageDataUrl,
    prompt: result.prompt,
  });
}
