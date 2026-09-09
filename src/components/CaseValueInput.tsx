"use client";

export default function CaseValueInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (raw: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          placeholder="F.eks. 5 000"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          className="w-40 rounded-lg border border-line bg-background-raised px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ember"
        />
        <span className="text-sm text-muted">kr</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Hva er saken dere skal avgjøre verdt (en anskaffelse, en avtale)?
        Sitter ti konsulenter og diskuterer hulltaking av ti hull i et bygg
        til 5 000 kr, er det greit å vite.
      </p>
    </div>
  );
}
