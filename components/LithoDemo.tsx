"use client";

import { useMemo, useState } from "react";
import { LithoControls } from "@/components/LithoControls";
import { MaskPreview } from "@/components/MaskPreview";
import { RecipeDetails } from "@/components/RecipeDetails";
import { RecipeEditor } from "@/components/RecipeEditor";
import { ScannerReadout } from "@/components/ScannerReadout";
import { WaferPanel } from "@/components/WaferPanel";
import { gateHalfPitchNm } from "@/lib/layout/geometry";
import { parseLayout, setOpcInRecipe } from "@/lib/layout/parser";
import { CPP } from "@/lib/layout/cells";
import {
  DEFAULT_EXAMPLE_ID,
  LAYOUT_EXAMPLES,
  LAYOUT_EXAMPLE_IDS,
  type ExampleId,
} from "@/lib/layout/examples";
import { analyseOptics } from "@/lib/litho/optics";
import type { LithoParams } from "@/lib/layout/types";
import type { PrSimulationPayload } from "@/lib/origin/loadPr";
import type { MockOriginPr } from "@/lib/origin/mockPrs";

type LithoDemoProps = {
  initialPayload?: PrSimulationPayload;
  pullRequest?: MockOriginPr;
  onBack?: () => void;
};

export function LithoDemo({ initialPayload, pullRequest, onBack }: LithoDemoProps = {}) {
  const defaultExample = LAYOUT_EXAMPLES[DEFAULT_EXAMPLE_ID];
  const [exampleId, setExampleId] = useState<ExampleId>(
    initialPayload?.exampleId ?? defaultExample.id,
  );
  const [recipe, setRecipe] = useState(initialPayload?.recipe ?? defaultExample.recipe);
  const [params, setParams] = useState<LithoParams>(
    initialPayload?.params ?? defaultExample.params,
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layout = useMemo(() => parseLayout(recipe), [recipe]);
  const optics = useMemo(
    () =>
      analyseOptics(
        gateHalfPitchNm(layout) ?? CPP / 2,
        params.scanner,
        params.illumination,
        params.doseMJcm2,
        params.focusNm,
      ),
    [layout, params],
  );

  const canSimulate = layout.errors.length === 0 && !loading;

  function selectExample(id: ExampleId) {
    const example = LAYOUT_EXAMPLES[id];
    setExampleId(id);
    setRecipe(example.recipe);
    setParams(example.params);
    setImageDataUrl(null);
    setPrompt(null);
    setError(null);
  }

  async function simulate() {
    if (!canSimulate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        pullRequest ? `/api/prs/${pullRequest.id}/simulate` : "/api/imagine",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pullRequest ? { params } : { recipe, params }),
        },
      );
      const data = (await response.json()) as {
        imageDataUrl?: string;
        prompt?: string;
        error?: string;
        simulation?: {
          imageDataUrl?: string;
          prompt?: string;
        };
      };
      const simulation = data.simulation ?? data;
      if (!response.ok) {
        setImageDataUrl(simulation.imageDataUrl ?? null);
        setPrompt(simulation.prompt ?? null);
        setError(data.error ?? `Request failed (${response.status})`);
        return;
      }
      setImageDataUrl(simulation.imageDataUrl ?? null);
      setPrompt(simulation.prompt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg text-fg">
      <header className="border-b border-card-04 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {pullRequest ? (
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-fg/50 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                ← PR #{pullRequest.number}
              </button>
            ) : (
              <p className="text-xs tracking-[0.18em] text-accent uppercase">GTM KO 2026</p>
            )}
            <h1 className="mt-1 text-xl font-medium">
              {pullRequest
                ? `Scanner simulation · ${pullRequest.title}`
                : "What the scanner prints, from layout code"}
            </h1>
          </div>
          {pullRequest ? (
            <div className="rounded-lg bg-card px-3 py-2 text-right">
              <p className="font-mono text-xs text-fg/70">{pullRequest.artifact.filename}</p>
              <p className="mt-0.5 text-[10px] text-fg/40">
                Mock CI artifact · {pullRequest.artifact.buildId}
              </p>
            </div>
          ) : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-fg/60">
          The mask and the imaging budget are computed from the recipe and scanner settings.
          The wafer image is Grok Imagine
          (<code className="font-mono text-fg/80">grok-imagine-image-2.0</code>) rendering that
          result — illustrative, not a Hopkins or ILT simulation.
        </p>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col gap-4 rounded-xl bg-card p-4">
          {pullRequest ? (
            <div className="rounded-lg bg-card-02 p-3">
              <p className="text-[10px] tracking-wide text-fg/40 uppercase">
                Loaded from Origin
              </p>
              <p className="mt-1 text-sm text-fg/80">
                PR #{pullRequest.number} at <code>{pullRequest.branch}</code>
              </p>
              {pullRequest.simulation.expectedOutcome === "defective" ? (
                <p className="mt-2 rounded-md bg-accent/10 px-2 py-1.5 text-[11px] text-accent">
                  Defect excursion: low dose and severe defocus are preloaded.
                </p>
              ) : null}
              <p className="mt-1 text-[11px] leading-4 text-fg/45">
                RTL-to-GDS generation is mocked. The mask below is deterministic from this loaded
                artifact.
              </p>
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-fg/60">
              Layout example
              <select
                className="rounded-md border-0 bg-card-03 px-2 py-1.5 text-sm text-fg"
                value={exampleId}
                disabled={loading}
                onChange={(event) => selectExample(event.target.value as ExampleId)}
              >
                {LAYOUT_EXAMPLE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {LAYOUT_EXAMPLES[id].label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-fg/45">{LAYOUT_EXAMPLES[exampleId].detail}</span>
            </label>
          )}
          <RecipeEditor
            value={recipe}
            onChange={setRecipe}
            errors={layout.errors}
            disabled={loading || Boolean(pullRequest)}
          />
          <RecipeDetails layout={layout} />
          {layout.provenance.kind === "synthetic" && !pullRequest ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-card-03 px-3 py-1.5 text-xs text-fg"
                disabled={loading}
                onClick={() =>
                  setRecipe(setOpcInRecipe(recipe, { ...layout.opc, serifs: !layout.opc.serifs }))
                }
              >
                OPC serifs {layout.opc.serifs ? "on" : "off"}
              </button>
              <button
                type="button"
                className="rounded-md bg-card-03 px-3 py-1.5 text-xs text-fg"
                disabled={loading}
                onClick={() =>
                  setRecipe(
                    setOpcInRecipe(recipe, {
                      ...layout.opc,
                      hammerheads: !layout.opc.hammerheads,
                    }),
                  )
                }
              >
                Hammerheads {layout.opc.hammerheads ? "on" : "off"}
              </button>
            </div>
          ) : null}
          <LithoControls params={params} onChange={setParams} disabled={loading} />
          <ScannerReadout optics={optics} />
          <button
            type="button"
            onClick={simulate}
            disabled={!canSimulate}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Exposing…" : "Expose wafer"}
          </button>
        </section>
        <MaskPreview layout={layout} />
        <WaferPanel
          imageDataUrl={imageDataUrl}
          prompt={prompt}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}
