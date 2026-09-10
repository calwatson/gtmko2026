import { generateImage } from "ai";
import { xai } from "@ai-sdk/xai";
import type { LithoParams } from "@/lib/layout/types";

export async function generateWaferImage(
  prompt: string,
  params: LithoParams,
  aspectRatio: `${number}:${number}` = "1:1",
): Promise<{ imageDataUrl: string }> {
  const { image } = await generateImage({
    model: xai.image("grok-imagine-image-2.0"),
    prompt,
    aspectRatio,
    providerOptions: {
      xai: {
        quality: params.quality,
        resolution: "1k",
      },
    },
  });

  if (image.base64) {
    return { imageDataUrl: `data:image/png;base64,${image.base64}` };
  }

  throw new Error("Imagine returned no image data");
}
