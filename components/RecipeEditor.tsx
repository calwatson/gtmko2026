"use client";

export function RecipeEditor({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  errors: { line: number; message: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <label className="text-xs tracking-wide text-fg/60" htmlFor="recipe">
        Layout recipe
      </label>
      <textarea
        id="recipe"
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[130px] flex-1 resize-none rounded-lg bg-card-04 p-3 font-mono text-[13px] leading-5 text-fg outline-none ring-0 focus:ring-1 focus:ring-accent"
      />
      {errors.length > 0 ? (
        <ul className="space-y-1 text-xs text-accent">
          {errors.map((err) => (
            <li key={`${err.line}-${err.message}`}>
              Line {err.line}: {err.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-fg/50">Parsed. Mask and imaging budget update live.</p>
      )}
    </div>
  );
}
