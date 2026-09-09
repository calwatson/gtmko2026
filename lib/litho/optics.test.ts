import { describe, expect, it } from "vitest";
import {
  analyseOptics,
  depthOfFocusNm,
  k1Factor,
  photonsPerNm2,
  resolutionLimitNm,
  SCANNERS,
} from "@/lib/litho/optics";

describe("Rayleigh scaling", () => {
  it("computes k1 as half-pitch · NA / lambda", () => {
    // 25 nm HP on 0.33 NA EUV
    expect(k1Factor(25, 0.33, 13.5)).toBeCloseTo(0.611, 3);
    // the same pitch on 1.35 NA ArF immersion is far below the 0.25 limit
    expect(k1Factor(25, 1.35, 193)).toBeCloseTo(0.175, 3);
  });

  it("resolves finer with High-NA but pays in depth of focus", () => {
    const lowNa = SCANNERS.nxe3800e;
    const highNa = SCANNERS.exe5200;

    expect(resolutionLimitNm(0.28, highNa.wavelengthNm, highNa.na)).toBeLessThan(
      resolutionLimitNm(0.28, lowNa.wavelengthNm, lowNa.na),
    );
    expect(depthOfFocusNm(highNa.wavelengthNm, highNa.na)).toBeLessThan(
      depthOfFocusNm(lowNa.wavelengthNm, lowNa.na),
    );
    expect(depthOfFocusNm(13.5, 0.33)).toBeCloseTo(124, 0);
    expect(depthOfFocusNm(13.5, 0.55)).toBeCloseTo(44.6, 1);
  });

  it("gives ArF far more photons per unit dose than EUV", () => {
    const euv = photonsPerNm2(40, 13.5);
    const arf = photonsPerNm2(40, 193);
    expect(euv).toBeCloseTo(27.2, 1);
    expect(arf / euv).toBeCloseTo(193 / 13.5, 1);
  });
});

describe("analyseOptics", () => {
  const hp = 25;

  it("resolves a 25 nm half-pitch on 0.33 NA EUV with dipole", () => {
    const report = analyseOptics(hp, "nxe3800e", "dipole", 40, 0);
    expect(report.printability).toBe("resolved");
    expect(report.stochasticRisk).toBe("low");
    expect(report.outOfFocusBudget).toBe(false);
  });

  it("declares the same pitch unprintable on ArF immersion", () => {
    const report = analyseOptics(hp, "nxt2100i", "dipole", 30, 0);
    expect(report.k1).toBeLessThan(0.25);
    expect(report.printability).toBe("impossible");
    expect(report.verdict).toContain("k₁ = 0.25 single-exposure limit");
  });

  it("flags EUV stochastic risk as dose drops", () => {
    expect(analyseOptics(hp, "nxe3800e", "dipole", 40, 0).stochasticRisk).toBe("low");
    expect(analyseOptics(hp, "nxe3800e", "dipole", 30, 0).stochasticRisk).toBe("elevated");
    expect(analyseOptics(hp, "nxe3800e", "dipole", 20, 0).stochasticRisk).toBe("high");
  });

  it("does not blame ArF for stochastics at the same dose", () => {
    expect(analyseOptics(hp, "nxt2100i", "dipole", 20, 0).stochasticRisk).toBe("low");
  });

  it("flags focus outside half the depth of focus", () => {
    const shallow = analyseOptics(hp, "exe5200", "dipole", 45, 40);
    expect(shallow.outOfFocusBudget).toBe(true);
    const deep = analyseOptics(hp, "nxe3800e", "dipole", 40, 40);
    expect(deep.outOfFocusBudget).toBe(false);
  });

  it("needs multi-patterning when the pupil cannot reach the pitch", () => {
    // k1 = 0.32: above the 0.25 physical limit, below what a conventional pupil resolves.
    const report = analyseOptics(13, "nxe3800e", "conventional", 40, 0);
    expect(report.k1).toBeGreaterThan(0.25);
    expect(report.printability).toBe("multi-patterning");
    expect(report.verdict).toContain("multi-patterning");
  });

  it("recovers that pitch with a dipole pupil", () => {
    expect(analyseOptics(13, "nxe3800e", "dipole", 40, 0).printability).not.toBe(
      "multi-patterning",
    );
  });

  it("models the PAS 5500/750E match for 130 nm-class SKY130 geometry", () => {
    const report = analyseOptics(130, "pas5500750e", "annular", 50, 0);
    expect(report.scanner).toMatchObject({
      source: "KrF DUV",
      wavelengthNm: 248,
      na: 0.7,
    });
    expect(report.k1).toBeCloseTo(0.367, 3);
    expect(report.printability).toBe("marginal");
    expect(report.stochasticRisk).toBe("low");
  });
});
