import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LITHO, DEFAULT_RECIPE, TINYTAPEOUT_RECIPE } from "@/lib/layout/types";
import { LAYOUT_EXAMPLES } from "@/lib/layout/examples";

vi.mock("@/lib/imagine/generateWafer", () => ({
  generateWaferImage: vi.fn(async () => ({
    imageDataUrl: "data:image/png;base64,ZmFrZQ==",
  })),
}));

describe("runImagine", () => {
  beforeEach(() => {
    process.env.XAI_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid recipe", async () => {
    const { runImagine } = await import("@/lib/imagine/runImagine");
    const result = await runImagine({
      recipe: "nope this is not a layout",
      params: DEFAULT_LITHO,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.parseErrors?.length).toBeGreaterThan(0);
    }
  });

  it("returns 400 for missing params", async () => {
    const { runImagine } = await import("@/lib/imagine/runImagine");
    const result = await runImagine({ recipe: DEFAULT_RECIPE });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an unknown scanner and out-of-range dose", async () => {
    const { runImagine } = await import("@/lib/imagine/runImagine");
    for (const params of [
      { ...DEFAULT_LITHO, scanner: "nxe9999" },
      { ...DEFAULT_LITHO, doseMJcm2: 5000 },
      { ...DEFAULT_LITHO, illumination: "freeform" },
    ]) {
      const result = await runImagine({ recipe: DEFAULT_RECIPE, params });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    }
  });

  it("returns a mocked wafer image for a valid recipe", async () => {
    const { runImagine } = await import("@/lib/imagine/runImagine");
    const { generateWaferImage } = await import("@/lib/imagine/generateWafer");
    const result = await runImagine({
      recipe: DEFAULT_RECIPE,
      params: DEFAULT_LITHO,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imageDataUrl).toContain("data:image/png");
      expect(result.prompt).toContain("98 transistors");
    }
    expect(generateWaferImage).toHaveBeenCalledOnce();
  });

  it("builds a GDS-aware prompt for the TinyTapeout preset", async () => {
    const { runImagine } = await import("@/lib/imagine/runImagine");
    const { generateWaferImage } = await import("@/lib/imagine/generateWafer");
    const params = LAYOUT_EXAMPLES["tinytapeout-sky130"].params;
    const result = await runImagine({ recipe: TINYTAPEOUT_RECIPE, params });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("authentic TinyTapeout SKY130 GDS crop");
    }
    expect(generateWaferImage).toHaveBeenCalledWith(
      expect.stringContaining("SKY130 planar CMOS polygons"),
      params,
      "2:1",
    );
  });

  it("fails closed without an API key", async () => {
    delete process.env.XAI_API_KEY;
    vi.resetModules();
    vi.doMock("@/lib/imagine/generateWafer", () => ({
      generateWaferImage: vi.fn(),
    }));
    const { runImagine } = await import("@/lib/imagine/runImagine");
    const result = await runImagine({
      recipe: DEFAULT_RECIPE,
      params: DEFAULT_LITHO,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/XAI_API_KEY/);
    }
  });
});
