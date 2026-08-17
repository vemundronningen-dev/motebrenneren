import Link from "next/link";
import NationalCounter from "@/components/NationalCounter";
import { getNationalStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getNationalStats();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-3xl flex flex-col items-center gap-10">
        <NationalCounter initialStats={stats} />

        <Link
          href="/start"
          className="group inline-flex items-center gap-2 rounded-full bg-ember px-8 py-4 text-lg sm:text-xl font-bold text-[#1a0d05] shadow-[0_0_40px_-6px_var(--ember)] transition hover:bg-ember-hot hover:shadow-[0_0_55px_-4px_var(--ember-hot)] active:scale-[0.98]"
        >
          Start ditt møte
          <span className="transition group-hover:translate-x-0.5">🔥</span>
        </Link>

        <p className="text-xs text-muted text-center max-w-sm">
          Anonymt. Vi lagrer bare tallene, aldri hvem eller hva.
        </p>

        <section className="w-full mt-8 rounded-2xl border border-line bg-background-raised p-6 text-sm text-muted leading-relaxed">
          <h2 className="text-foreground font-semibold mb-2">
            Hvorfor Møtebrenneren?
          </h2>
          <p>
            Sett opp hvem som sitter i møtet, trykk start, og se pengene
            brenne live langs en tidslinje mens møtet pågår. Del lenken med
            Teams-kollegene dine så følger alle med på samme brennende
            teller – synkront, uansett hvem som glemte å trykke mute.
          </p>
        </section>
      </div>
    </main>
  );
}
