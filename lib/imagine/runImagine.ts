import { layoutIsValid, parseLayout } from "@/lib/layout/parser";
import { buildImaginePrompt } from "@/lib/layout/prompt";
import { closestAspectRatio, layoutStats } from "@/lib/layout/geometry";
import { generateWaferImage } from "@/lib/imagine/generateWafer";
import { ILLUMINATIONS, SCANNERS } from "@/lib/litho/optics";
import type { ImagineRequestBody, LithoParams } from "@/lib/layout/types";

const DOSE_LIMITS: [number, number] = [10, 100];
const FOCUS_LIMITS: [number, number] = [-150, 150];

export type ImagineSuccess = {
  ok: true;
  imageDataUrl: string;
  prompt: string;
};

export type ImagineFailure = {
  ok: false;
  status: number;
  error: string;
  parseErrors?: { line: number; message: string }[];
};

export type ImagineResult = ImagineSuccess | ImagineFailure;

function isLithoParams(value: unknown): value is LithoParams {
  if (!value || typeof value !== "object") return false;
  const params = value as Record<string, unknown>;
  return (
    typeof params.scanner === "string" &&
    params.scanner in SCANNERS &&
    typeof params.illumination === "string" &&
    params.illumination in ILLUMINATIONS &&
    typeof params.doseMJcm2 === "number" &&
    params.doseMJcm2 >= DOSE_LIMITS[0] &&
    params.doseMJcm2 <= DOSE_LIMITS[1] &&
    typeof params.focusNm === "number" &&
    params.focusNm >= FOCUS_LIMITS[0] &&
    params.focusNm <= FOCUS_LIMITS[1] &&
    (params.quality === "low" || params.quality === "medium")
  );
}

export function parseImagineBody(raw: unknown): ImagineRequestBody | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "JSON body required" };
  const body = raw as Record<string, unknown>;
  if (typeof body.recipe !== "string" || body.recipe.trim().length === 0) {
    return { error: "recipe must be a non-empty string" };
  }
  if (!isLithoParams(body.params)) {
    return {
      error: "params must include scanner, illumination, doseMJcm2, focusNm, and quality",
    };
  }
  return { recipe: body.recipe, params: body.params };
}

export async function runImagine(raw: unknown): Promise<ImagineResult> {
  if (!process.env.XAI_API_KEY) {
    return {
      ok: false,
      status: 500,
      error: "XAI_API_KEY is not set. Add it to .env.local.",
    };
  }

  const parsed = parseImagineBody(raw);
  if ("error" in parsed) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const layout = parseLayout(parsed.recipe);
  if (!layoutIsValid(layout)) {
    return {
      ok: false,
      status: 400,
      error: "Layout recipe has errors.",
      parseErrors: layout.errors,
    };
  }

  const prompt = buildImaginePrompt(layout, parsed.params);
  const stats = layoutStats(layout);
  const aspectRatio = closestAspectRatio(stats.widthNm, stats.heightNm);

  try {
    const { imageDataUrl } = await generateWaferImage(prompt, parsed.params, aspectRatio);
    return { ok: true, imageDataUrl, prompt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Imagine request failed";
    return { ok: false, status: 502, error: message };
  }
}
