"use client";

import type { OpticsReport } from "@/lib/litho/optics";

const PRINTABILITY_TONE: Record<OpticsReport["printability"], string> = {
  resolved: "text-emerald-400",
  marginal: "text-amber-400",
  "multi-patterning": "text-accent",
  impossible: "text-accent",
};

const PRINTABILITY_LABEL: Record<OpticsReport["printability"], string> = {
  resolved: "Resolved",
  marginal: "Marginal",
  "multi-patterning": "Multi-patterning",
  impossible: "Not printable",
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-fg/50">{label}</dt>
      <dd className="font-mono text-sm text-fg">{value}</dd>
    </div>
  );
}

export function ScannerReadout({ optics }: { optics: OpticsReport }) {
  return (
    <div className="rounded-lg bg-card-02 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs tracking-wide text-fg/60">Imaging budget</h3>
        <span className={`text-xs font-medium ${PRINTABILITY_TONE[optics.printability]}`}>
          {PRINTABILITY_LABEL[optics.printability]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Metric label="Half-pitch" value={`${optics.halfPitchNm} nm`} />
        <Metric label="k₁" value={optics.k1.toFixed(2)} />
        <Metric label="Pupil limit" value={`${optics.resolutionNm.toFixed(1)} nm HP`} />
        <Metric label="Depth of focus" value={`${optics.dofNm.toFixed(0)} nm`} />
        <Metric
          label={optics.scanner.source === "EUV" ? "EUV photons" : "ArF photons"}
          value={`${optics.photonsPerNm2.toFixed(0)} /nm²`}
        />
        <Metric
          label="Stochastic risk"
          value={optics.stochasticRisk}
        />
      </dl>

      <p className="mt-2 text-[11px] leading-4 text-fg/60">{optics.verdict}</p>
      {optics.outOfFocusBudget ? (
        <p className="mt-1 text-[11px] leading-4 text-accent">
          Focus offset exceeds half the depth of focus.
        </p>
      ) : null}
    </div>
  );
}
