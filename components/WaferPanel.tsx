"use client";

export function WaferPanel({
  imageDataUrl,
  prompt,
  loading,
  error,
}: {
  imageDataUrl: string | null;
  prompt: string | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-fg">Printed wafer</h2>
        <p className="text-xs text-fg/60">Grok Imagine · illustrative, not OPC/ILT</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-card-04">
        {loading ? (
          <p className="px-6 text-center text-sm text-fg/70">Exposing wafer…</p>
        ) : imageDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Grok Imagine simulated wafer print"
              className="h-full max-h-[420px] w-full object-contain"
            />
            {error ? (
              <div
                role="alert"
                className="absolute right-3 bottom-3 left-3 rounded-lg border border-accent/35 bg-bg/90 px-3 py-2 text-xs text-accent backdrop-blur-sm"
              >
                <p className="font-medium">Defect detected during simulation</p>
                <p className="mt-0.5 text-fg/65">{error}</p>
              </div>
            ) : null}
          </>
        ) : error ? (
          <p role="alert" className="px-6 text-center text-sm text-accent">
            {error}
          </p>
        ) : (
          <p className="px-6 text-center text-sm text-fg/60">
            Expose the wafer to render an SEM of this layout at the current scanner settings.
          </p>
        )}
      </div>
      {prompt ? (
        <details className="mt-3 rounded-md bg-card-02 p-2 text-xs text-fg/60">
          <summary className="cursor-pointer text-fg/80">Last Imagine prompt</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-4">
            {prompt}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
