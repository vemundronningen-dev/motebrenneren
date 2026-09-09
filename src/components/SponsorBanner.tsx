import { SPONSORS } from "@/lib/sponsors";

/** Kompakt variant - til footeren, synlig på alle sider. */
export function SponsorBannerCompact() {
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>Møtebrenneren driftes av folk som også driver</span>
      {SPONSORS.map((s, i) => (
        <span key={s.url} className="contents">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="font-semibold text-amber hover:text-ember"
          >
            {s.name}
          </a>
          {i < SPONSORS.length - 1 && <span>og</span>}
        </span>
      ))}
    </p>
  );
}

/** Full variant - kort med begge butikkene, til forsiden. */
export function SponsorBannerCard() {
  return (
    <section className="w-full rounded-2xl border border-line bg-background-raised p-5">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">
        Annonse
      </p>
      <p className="mt-1 text-center text-sm text-muted">
        Møtebrenneren driftes av folkene bak disse nettbutikkene 🛠️
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SPONSORS.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="rounded-xl border border-ember/30 bg-ember/[0.06] px-4 py-3 text-center transition hover:border-ember/60 hover:bg-ember/10"
          >
            <div className="font-bold text-foreground">{s.name}</div>
            <div className="text-xs text-muted">{s.tagline}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
