/**
 * Rayleigh-scaling optics for the scanner panel. These are first-order
 * estimates (k1/k2 scaling), not a Hopkins or Abbe imaging simulation.
 */

export type ScannerId = "pas5500750e" | "nxe3800e" | "exe5200" | "nxt2100i";

export type Scanner = {
  id: ScannerId;
  name: string;
  platform: string;
  source: "EUV" | "ArF immersion" | "KrF DUV";
  wavelengthNm: number;
  na: number;
  nominalDose: number;
  doseRange: [number, number];
};

export const SCANNERS: Record<ScannerId, Scanner> = {
  pas5500750e: {
    id: "pas5500750e",
    name: "PAS 5500/750E",
    platform: "0.70 NA KrF DUV",
    source: "KrF DUV",
    wavelengthNm: 248,
    na: 0.7,
    nominalDose: 50,
    doseRange: [20, 80],
  },
  nxe3800e: {
    id: "nxe3800e",
    name: "TWINSCAN NXE:3800E",
    platform: "0.33 NA EUV",
    source: "EUV",
    wavelengthNm: 13.5,
    na: 0.33,
    nominalDose: 40,
    doseRange: [20, 80],
  },
  exe5200: {
    id: "exe5200",
    name: "TWINSCAN EXE:5200",
    platform: "0.55 NA High-NA EUV",
    source: "EUV",
    wavelengthNm: 13.5,
    na: 0.55,
    nominalDose: 45,
    doseRange: [20, 80],
  },
  nxt2100i: {
    id: "nxt2100i",
    name: "TWINSCAN NXT:2100i",
    platform: "1.35 NA ArF immersion",
    source: "ArF immersion",
    wavelengthNm: 193,
    na: 1.35,
    nominalDose: 30,
    doseRange: [15, 60],
  },
};

export const SCANNER_IDS = Object.keys(SCANNERS) as ScannerId[];

export type IlluminationId = "conventional" | "annular" | "quadrupole" | "dipole";

export type Illumination = {
  id: IlluminationId;
  label: string;
  /** Lowest k1 this pupil can resolve for dense features. */
  k1Floor: number;
  note: string;
};

export const ILLUMINATIONS: Record<IlluminationId, Illumination> = {
  conventional: {
    id: "conventional",
    label: "Conventional σ 0.70",
    k1Floor: 0.4,
    note: "Widest pupil fill, weakest contrast on dense pitches.",
  },
  annular: {
    id: "annular",
    label: "Annular 0.70 / 0.90",
    k1Floor: 0.34,
    note: "Balanced for mixed pitch and 2D structures.",
  },
  quadrupole: {
    id: "quadrupole",
    label: "Quadrupole 45°",
    k1Floor: 0.31,
    note: "Favours contacts and orthogonal line pairs.",
  },
  dipole: {
    id: "dipole",
    label: "Dipole 90° (Y)",
    k1Floor: 0.28,
    note: "Highest contrast on 1D dense gate lines, poor for 2D.",
  },
};

export const ILLUMINATION_IDS = Object.keys(ILLUMINATIONS) as IlluminationId[];

/** Planck constant times c, in J·nm. */
const HC_J_NM = 1.98644586e-16;

/** k1 = half-pitch · NA / λ. Below 0.25 no single exposure can resolve the pitch. */
export function k1Factor(halfPitchNm: number, na: number, wavelengthNm: number): number {
  return (halfPitchNm * na) / wavelengthNm;
}

/** Smallest half-pitch the given pupil resolves: k1 · λ / NA. */
export function resolutionLimitNm(k1Floor: number, wavelengthNm: number, na: number): number {
  return (k1Floor * wavelengthNm) / na;
}

/** Rayleigh depth of focus, k2 · λ / NA². High-NA pays for resolution with DOF. */
export function depthOfFocusNm(wavelengthNm: number, na: number, k2 = 1): number {
  return (k2 * wavelengthNm) / (na * na);
}

/**
 * Absorbed photon density. EUV photons carry ~14x the energy of ArF photons,
 * so an equal dose delivers far fewer of them, which is the root of EUV
 * stochastic defectivity.
 */
export function photonsPerNm2(doseMJcm2: number, wavelengthNm: number): number {
  const photonEnergyJ = HC_J_NM / wavelengthNm;
  const photonsPerCm2 = (doseMJcm2 * 1e-3) / photonEnergyJ;
  return photonsPerCm2 / 1e14;
}

export type Printability = "resolved" | "marginal" | "multi-patterning" | "impossible";

export type OpticsReport = {
  scanner: Scanner;
  illumination: Illumination;
  halfPitchNm: number;
  k1: number;
  resolutionNm: number;
  dofNm: number;
  photonsPerNm2: number;
  focusNm: number;
  outOfFocusBudget: boolean;
  stochasticRisk: "low" | "elevated" | "high";
  printability: Printability;
  verdict: string;
};

function describe(printability: Printability, scanner: Scanner, resolutionNm: number): string {
  switch (printability) {
    case "impossible":
      return `Below the k₁ = 0.25 single-exposure limit for ${scanner.platform}. No illuminator recovers this pitch.`;
    case "multi-patterning":
      return `Under the ${resolutionNm.toFixed(1)} nm limit of this pupil. Needs a stronger illuminator or multi-patterning.`;
    case "marginal":
      return "Within reach but low contrast. Expect a tight process window and CD uniformity pressure.";
    case "resolved":
      return "Resolves in a single exposure with process window to spare.";
  }
}

export function analyseOptics(
  halfPitchNm: number,
  scannerId: ScannerId,
  illuminationId: IlluminationId,
  doseMJcm2: number,
  focusNm: number,
): OpticsReport {
  const scanner = SCANNERS[scannerId];
  const illumination = ILLUMINATIONS[illuminationId];

  const k1 = k1Factor(halfPitchNm, scanner.na, scanner.wavelengthNm);
  const resolutionNm = resolutionLimitNm(illumination.k1Floor, scanner.wavelengthNm, scanner.na);
  const dofNm = depthOfFocusNm(scanner.wavelengthNm, scanner.na);
  const photons = photonsPerNm2(doseMJcm2, scanner.wavelengthNm);

  const printability: Printability =
    k1 < 0.25
      ? "impossible"
      : k1 < illumination.k1Floor
        ? "multi-patterning"
        : k1 < illumination.k1Floor * 1.15
          ? "marginal"
          : "resolved";

  // EUV shot noise scales as 1/sqrt(N); ArF delivers enough photons to ignore it.
  const stochasticRisk =
    scanner.source !== "EUV" ? "low" : photons < 15 ? "high" : photons < 25 ? "elevated" : "low";

  return {
    scanner,
    illumination,
    halfPitchNm,
    k1,
    resolutionNm,
    dofNm,
    photonsPerNm2: photons,
    focusNm,
    outOfFocusBudget: Math.abs(focusNm) > dofNm / 2,
    stochasticRisk,
    printability,
    verdict: describe(printability, scanner, resolutionNm),
  };
}
