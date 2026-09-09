"use client";

import {
  ILLUMINATIONS,
  ILLUMINATION_IDS,
  SCANNERS,
  SCANNER_IDS,
  type IlluminationId,
  type ScannerId,
} from "@/lib/litho/optics";
import type { LithoParams } from "@/lib/layout/types";

export function LithoControls({
  params,
  onChange,
  disabled,
}: {
  params: LithoParams;
  onChange: (next: LithoParams) => void;
  disabled?: boolean;
}) {
  const scanner = SCANNERS[params.scanner];
  const [doseMin, doseMax] = scanner.doseRange;

  function selectScanner(id: ScannerId) {
    const next = SCANNERS[id];
    // Dose ranges differ per platform; clamp so the slider stays meaningful.
    onChange({
      ...params,
      scanner: id,
      doseMJcm2: Math.min(Math.max(params.doseMJcm2, next.doseRange[0]), next.doseRange[1]),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-fg/60">
        Scanner
        <select
          className="rounded-md border-0 bg-card-03 px-2 py-1.5 text-sm text-fg"
          value={params.scanner}
          disabled={disabled}
          onChange={(e) => selectScanner(e.target.value as ScannerId)}
        >
          {SCANNER_IDS.map((id) => (
            <option key={id} value={id}>
              {SCANNERS[id].name} · {SCANNERS[id].platform}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-fg/60">
        Illumination
        <select
          className="rounded-md border-0 bg-card-03 px-2 py-1.5 text-sm text-fg"
          value={params.illumination}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...params, illumination: e.target.value as IlluminationId })
          }
        >
          {ILLUMINATION_IDS.map((id) => (
            <option key={id} value={id}>
              {ILLUMINATIONS[id].label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-fg/45">{ILLUMINATIONS[params.illumination].note}</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-fg/60">
          Dose {params.doseMJcm2} mJ/cm²
          <input
            type="range"
            min={doseMin}
            max={doseMax}
            step={1}
            value={params.doseMJcm2}
            disabled={disabled}
            onChange={(e) => onChange({ ...params, doseMJcm2: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg/60">
          Focus {params.focusNm} nm
          <input
            type="range"
            min={-120}
            max={120}
            step={5}
            value={params.focusNm}
            disabled={disabled}
            onChange={(e) => onChange({ ...params, focusNm: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-fg/60">
        Imagine quality
        <select
          className="rounded-md border-0 bg-card-03 px-2 py-1.5 text-sm text-fg"
          value={params.quality}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...params, quality: e.target.value as LithoParams["quality"] })
          }
        >
          <option value="low">low (faster)</option>
          <option value="medium">medium (finer)</option>
        </select>
      </label>
    </div>
  );
}
