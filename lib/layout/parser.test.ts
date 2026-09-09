import { describe, expect, it } from "vitest";
import { parseLayout, setOpcInRecipe } from "@/lib/layout/parser";
import { DEFAULT_LITHO, DEFAULT_RECIPE, TINYTAPEOUT_RECIPE } from "@/lib/layout/types";
import { DEFAULT_EXAMPLE_ID, LAYOUT_EXAMPLES } from "@/lib/layout/examples";
import {
  closestAspectRatio,
  gateHalfPitchNm,
  gateSpaceNm,
  layoutStats,
  layoutToMask,
} from "@/lib/layout/geometry";
import { buildImaginePrompt } from "@/lib/layout/prompt";
import { CELL_H, CPP, POLY_W } from "@/lib/layout/cells";
import { getRecipeDetails } from "@/lib/layout/details";

const noOpc = setOpcInRecipe(DEFAULT_RECIPE, { serifs: false, hammerheads: false });

describe("parseLayout", () => {
  it("expands the default recipe into a multi-row cell block", () => {
    const layout = parseLayout(DEFAULT_RECIPE);
    expect(layout.errors).toEqual([]);
    expect(layout.nodeNm).toBe(5);
    expect(layout.cells).toHaveLength(14);

    const stats = layoutStats(layout);
    expect(stats.transistors).toBe(98);
    expect(stats.rows).toBe(3);
  });

  it("places row cells left to right, abutted", () => {
    const layout = parseLayout(`node 5nm\nrow id=r0 y=0 cells=inv,nand2,dff`);
    expect(layout.errors).toEqual([]);
    const [inv, nand2, dff] = layout.cells;
    expect(inv.x).toBe(0);
    expect(nand2.x).toBe(inv.w);
    expect(dff.x).toBe(inv.w + nand2.w);
    expect(dff.gates).toBe(12);
  });

  it("mirrors odd rows so neighbours share a power rail", () => {
    const layout = parseLayout(
      `node 5nm\nrow id=r0 y=0 cells=inv\nrow id=r1 y=${CELL_H} cells=inv`,
    );
    expect(layout.errors).toEqual([]);
    expect(layout.cells.map((c) => c.mirrored)).toEqual([false, true]);
  });

  it("counts one transistor per gate per diffusion band", () => {
    const layout = parseLayout(`node 5nm\nrow id=r0 y=0 cells=nand2`);
    expect(layoutStats(layout).transistors).toBe(4);
    expect(layout.shapes.filter((s) => s.layer === "poly")).toHaveLength(2);
  });

  it("reports unknown cell types and lists the library", () => {
    const layout = parseLayout(`node 5nm\nrow id=r0 y=0 cells=inv,franken`);
    expect(layout.errors[0].message).toContain("unknown cell type franken");
    expect(layout.errors[0].message).toContain("nand2");
  });

  it("reports unknown commands and missing fields", () => {
    const layout = parseLayout(`poly foo=1\nline x=0 y=0 w=10nm`);
    expect(layout.errors.some((e) => e.message.includes("unknown command"))).toBe(true);
    expect(layout.errors.some((e) => e.message.includes("missing id="))).toBe(true);
    expect(layout.errors.some((e) => e.message.includes("missing l="))).toBe(true);
  });

  it("rejects invalid lengths", () => {
    const layout = parseLayout(`line id=a x=foo y=0 w=10 l=10`);
    expect(layout.errors.some((e) => e.message.includes("invalid x="))).toBe(true);
  });

  it("still supports hand-drawn metal and via primitives", () => {
    const layout = parseLayout(`node 5nm\nline id=m1 x=0 y=0 w=32nm l=240nm\nvia id=v1 x=32nm y=80nm d=24nm`);
    expect(layout.errors).toEqual([]);
    expect(layout.cells).toHaveLength(0);
    expect(layout.shapes.map((s) => s.layer)).toEqual(["metal1", "via"]);
  });

  it("loads the authentic TinyTapeout GDS crop", () => {
    const layout = parseLayout(TINYTAPEOUT_RECIPE);
    const stats = layoutStats(layout);

    expect(layout.errors).toEqual([]);
    expect(layout.provenance).toMatchObject({
      kind: "gds",
      pdk: "SKY130",
      sourceCell: "spm",
      standardCellCount: 29,
      license: "Apache-2.0",
    });
    expect(layout.shapes).toHaveLength(1783);
    expect(new Set(layout.shapes.map((shape) => shape.layer))).toEqual(
      new Set([
        "nwell",
        "diffusion",
        "poly",
        "licon",
        "local-interconnect",
        "mcon",
        "metal1",
        "via1",
        "metal2",
        "via2",
        "metal3",
      ]),
    );
    expect(stats).toMatchObject({
      transistors: 0,
      cells: 29,
      rows: 3,
      widthNm: 30000,
      heightNm: 13000,
    });
    expect(gateHalfPitchNm(layout)).toBe(130);
  });

  it("exposes the GDS provenance and geometry as recipe details", () => {
    const details = getRecipeDetails(parseLayout(TINYTAPEOUT_RECIPE));
    expect(details).toContainEqual({
      label: "Geometry",
      value: "1,783 polygons · 11 layers",
    });
    expect(details).toContainEqual({
      label: "Source window",
      value: "x 20–50 µm · y 38–51 µm",
    });
    expect(details).toContainEqual({
      label: "Source revision",
      value: "2969b5e7b400",
    });
  });

  it("uses TinyTapeout as the initial example", () => {
    expect(DEFAULT_EXAMPLE_ID).toBe("tinytapeout-sky130");
  });

  it("rejects unknown GDS presets", () => {
    expect(parseLayout("gds preset=made-up").errors[0].message).toContain(
      "preset=tinytapeout-sky130",
    );
  });

  it("toggles opc in the recipe text", () => {
    const next = setOpcInRecipe(DEFAULT_RECIPE, { serifs: false, hammerheads: true });
    expect(parseLayout(next).opc).toEqual({ serifs: false, hammerheads: true });
  });
});

describe("geometry", () => {
  it("adds OPC shapes only when enabled", () => {
    const withOpc = layoutToMask(parseLayout(DEFAULT_RECIPE));
    const without = layoutToMask(parseLayout(noOpc));
    expect(withOpc.shapes.length).toBeGreaterThan(without.shapes.length);
    expect(without.shapes.some((s) => s.layer === "opc")).toBe(false);
  });

  it("measures the critical gate-to-gate space", () => {
    expect(gateSpaceNm(parseLayout(DEFAULT_RECIPE))).toBe(CPP - POLY_W);
  });

  it("reports the gate half-pitch the scanner has to resolve", () => {
    expect(gateHalfPitchNm(parseLayout(DEFAULT_RECIPE))).toBe(CPP / 2);
    expect(gateHalfPitchNm(parseLayout(`node 5nm\nline id=m1 x=0 y=0 w=32nm l=240nm`))).toBeNull();
  });

  it("matches the generated image aspect to the layout shape", () => {
    expect(closestAspectRatio(964, 630)).toBe("3:2");
    expect(closestAspectRatio(400, 400)).toBe("1:1");
    expect(closestAspectRatio(200, 800)).toBe("1:2");
    expect(closestAspectRatio(0, 0)).toBe("1:1");
  });
});

describe("buildImaginePrompt", () => {
  it("describes the transistor count, structure and exposure", () => {
    const prompt = buildImaginePrompt(parseLayout(DEFAULT_RECIPE), DEFAULT_LITHO);
    expect(prompt).toContain("98 transistors");
    expect(prompt).toContain("14 abutted standard cells");
    expect(prompt).toContain("D flip-flop");
    expect(prompt).toContain("Exposed at 13.5 nm on a 0.33 NA EUV scanner");
    expect(prompt).toContain("Every fin-gate crossing is one transistor");
    expect(prompt).toContain("no invented circuitry");
  });

  it("asks for unresolved smears when the pitch is beyond the optics", () => {
    const prompt = buildImaginePrompt(parseLayout(DEFAULT_RECIPE), {
      ...DEFAULT_LITHO,
      scanner: "nxt2100i",
      doseMJcm2: 30,
    });
    expect(prompt).toContain("beyond what this exposure resolves");
    expect(prompt).toContain("single blurred ridge");
  });

  it("asks for stochastic defects at low EUV dose", () => {
    const prompt = buildImaginePrompt(parseLayout(noOpc), {
      ...DEFAULT_LITHO,
      doseMJcm2: 20,
      focusNm: 80,
    });
    expect(prompt).toContain("photon shot noise dominates");
    expect(prompt).toContain("microbridges");
    expect(prompt).toContain("line-ends pull back");
    expect(prompt).toContain("Focus is 80 nm");
  });

  it("describes TinyTapeout as planar SKY130 rather than FinFET", () => {
    const prompt = buildImaginePrompt(
      parseLayout(TINYTAPEOUT_RECIPE),
      LAYOUT_EXAMPLES["tinytapeout-sky130"].params,
    );
    expect(prompt).toContain("authentic TinyTapeout SKY130 GDS crop");
    expect(prompt).toContain("29 placed standard-cell instances");
    expect(prompt).toContain("Polysilicon gates crossing diffusion");
    expect(prompt).toContain("248 nm");
    expect(prompt).not.toContain("silicon fins");
    expect(prompt).toContain("not a reticle with OPC");
  });
});
