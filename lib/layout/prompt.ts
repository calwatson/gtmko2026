import { CPP, FIN_PITCH, FIN_W, POLY_W } from "./cells";
import { gateHalfPitchNm, gateSpaceNm, layoutStats } from "./geometry";
import { analyseOptics } from "@/lib/litho/optics";
import type { Layout, LithoParams } from "./types";

function cellSummary(layout: Layout): string {
  const counts = new Map<string, number>();
  for (const cell of layout.cells) {
    counts.set(cell.label, (counts.get(cell.label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, n]) => `${n}× ${label}`).join(", ");
}

export function buildImaginePrompt(layout: Layout, params: LithoParams): string {
  const stats = layoutStats(layout);
  const isGds = layout.provenance.kind === "gds";
  const halfPitch = gateHalfPitchNm(layout) ?? CPP / 2;
  const space = gateSpaceNm(layout);
  const optics = analyseOptics(
    halfPitch,
    params.scanner,
    params.illumination,
    params.doseMJcm2,
    params.focusNm,
  );

  const exposure = `Exposed at ${optics.scanner.wavelengthNm} nm on a ${optics.scanner.na} NA ${optics.scanner.source} scanner with ${optics.illumination.label} illumination.`;

  const resolutionNote =
    optics.printability === "impossible" || optics.printability === "multi-patterning"
      ? `The ${halfPitch} nm half-pitch is beyond what this exposure resolves (k₁ = ${optics.k1.toFixed(2)}): show gates merging into unresolved smears, with whole line pairs printing as a single blurred ridge.`
      : optics.printability === "marginal"
        ? `At k₁ = ${optics.k1.toFixed(2)} contrast is marginal: show visible CD variation from gate to gate and rough line edges.`
        : `At k₁ = ${optics.k1.toFixed(2)} the gates resolve cleanly, with only normal line-edge roughness.`;

  const stochasticNote =
    optics.stochasticRisk === "high"
      ? `Dose is only ${params.doseMJcm2} mJ/cm² (~${optics.photonsPerNm2.toFixed(0)} EUV photons/nm²), so photon shot noise dominates: scatter clear stochastic defects through the field — microbridges between gates, randomly broken gate lines, missing and merged contacts, and pronounced line-width roughness.`
      : optics.stochasticRisk === "elevated"
        ? `At ${params.doseMJcm2} mJ/cm² (~${optics.photonsPerNm2.toFixed(0)} EUV photons/nm²) stochastic effects are visible: occasional microbridges, a few necked gates, and noticeable line-edge roughness.`
        : "Photon count is high enough that stochastic defects are rare; edges are smooth and uniform.";

  const focusNote =
    params.focusNm === 0
      ? "At best focus every edge is sharp."
      : optics.outOfFocusBudget
        ? `Focus is ${params.focusNm} nm, outside the ${optics.dofNm.toFixed(0)} nm depth of focus: the whole field is soft, contacts fill in, and fine gates lose contrast badly.`
        : `Focus is ${params.focusNm} nm, inside the ${optics.dofNm.toFixed(0)} nm depth of focus: edges are slightly soft but features stay resolved.`;

  const opcNote = isGds
    ? "The source is final drawn GDS geometry, not a reticle with OPC. Preserve its routed polygon topology and do not add assist features."
    : layout.opc.serifs
      ? "OPC serifs are applied, so gate line-ends print close to square."
      : "No OPC on the gate layer, so line-ends pull back and corners round off badly.";

  const bridging =
    space !== null && optics.printability !== "resolved"
      ? `Gate-to-gate space is ${space} nm, so bridging between neighbouring gates should be visible in the densest cells.`
      : "";

  const sourceDescription = isGds
    ? `Top-down scanning electron microscope image of the authentic TinyTapeout SKY130 GDS crop: ${stats.cells} placed standard-cell instances across ${stats.rows} rows, spanning ${(stats.widthNm / 1000).toFixed(0)} by ${(stats.heightNm / 1000).toFixed(0)} micrometres.`
    : `Top-down scanning electron microscope image of a printed logic wafer, ${stats.transistors} transistors across ${stats.cells} abutted standard cells in ${stats.rows} mirrored rows, spanning roughly ${stats.widthNm} by ${stats.heightNm} nm.`;

  const structure = isGds
    ? [
        "- SKY130 planar CMOS polygons: n-well and diffusion at the substrate.",
        "- Polysilicon gates crossing diffusion to form real 130 nm-class transistors.",
        "- Local interconnect, licon and mcon contact cuts above devices.",
        "- Routed metal 1, metal 2 and metal 3, connected by via 1 and via 2.",
        "- Irregular standard-cell logic and routed nets; this is not a repeated test grating.",
      ]
    : [
        `- Horizontal silicon fins ${FIN_W} nm wide on a ${FIN_PITCH} nm pitch, running continuously across each cell row.`,
        `- Vertical poly gate lines ${POLY_W} nm wide on a ${CPP} nm contacted pitch, crossing the fins at right angles. Every fin-gate crossing is one transistor.`,
        "- Bright square source/drain contacts in the gaps between gates.",
        "- Wider metal-1 power rails along the top and bottom of each cell row, shared between mirrored neighbours.",
        `Cell mix: ${cellSummary(layout) || "hand-drawn features only"}.`,
      ];

  return [
    sourceDescription,
    exposure,
    "Structure in the field, and nothing else:",
    ...structure,
    resolutionNote,
    stochasticNote,
    focusNote,
    opcNote,
    bridging,
    "Photoreal greyscale SEM: secondary-electron edge brightening on raised resist, faint charging, resist grain, shallow depth of field.",
    "No text, no labels, no scale bars, no arrows, no colour overlays, no invented circuitry beyond the structure described.",
  ]
    .filter(Boolean)
    .join("\n");
}
