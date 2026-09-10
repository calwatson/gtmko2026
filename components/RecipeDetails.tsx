import { getRecipeDetails } from "@/lib/layout/details";
import type { Layout } from "@/lib/layout/types";

export function RecipeDetails({ layout }: { layout: Layout }) {
  const details = getRecipeDetails(layout);

  return (
    <details className="rounded-lg bg-card-02 p-3" open>
      <summary className="cursor-pointer text-xs tracking-wide text-fg/70">
        Recipe details
      </summary>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] leading-4">
        {details.map((detail) => (
          <div className="contents" key={detail.label}>
            <dt className="text-fg/45">{detail.label}</dt>
            <dd className="min-w-0 text-fg/75">{detail.value}</dd>
          </div>
        ))}
      </dl>
      {layout.provenance.kind === "gds" ? (
        <a
          className="mt-3 inline-block text-[11px] text-fg/55 underline decoration-fg/25 underline-offset-2"
          href={`${layout.provenance.sourceUrl}/tree/${layout.provenance.sourceRevision}`}
          target="_blank"
          rel="noreferrer"
        >
          View exact TinyTapeout source revision
        </a>
      ) : (
        <p className="mt-3 text-[11px] leading-4 text-fg/45">
          Commands: <code>node</code>, <code>row</code>, <code>cell</code>,{" "}
          <code>line</code>, <code>via</code>, <code>opc</code>
        </p>
      )}
    </details>
  );
}
