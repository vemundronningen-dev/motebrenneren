import type { Metadata } from "next";

export const metadata: Metadata = { title: "Personvern" };

export default function PersonvernPage() {
  return (
    <main className="flex-1 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Personvern</h1>
        <p className="mt-2 text-muted">
          Kort versjon: Møtebrenneren vet ikke hvem du er, og vil ikke vite
          det.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-semibold text-lg mb-1">Hva vi lagrer</h2>
            <p className="text-muted">
              Når du stopper et møte lagrer vi: totalbeløpet, hvor lenge
              møtet varte, hvor mange deltakere det hadde, og tidspunktet.
              Ingen navn, ingen agenda, ingen bedriftsnavn. For delte
              møterom lagres i tillegg en tilfeldig møtekode (f.eks.
              &quot;gul-elg-42&quot;) og satsene du selv har satt opp –
              ingenting som identifiserer deg eller kollegene dine.
            </p>
            <p className="mt-2 text-muted">
              Du kan valgfritt merke møtet med en møtetype (f.eks.
              &quot;Salgsmøte&quot; eller &quot;Statusmøte&quot;) slik at du
              selv kan se igjen hva slags møter som koster mest – dette er
              en kort kategori, ikke møtetittel eller agenda, og lagres kun
              hvis du selv skriver noe inn.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-1">Cookies</h2>
            <p className="text-muted">
              Vi bruker ingen sporings- eller analysecookies. Møtebrenneren
              lagrer noen innstillinger lokalt i nettleseren din
              (localStorage) – som dine egne timepriser, hvilke møter du
              har startet som vert, og en personlig møtehistorikk (beløp,
              møtetype, varighet) du kan se under &quot;Historikk&quot; –
              slik at du slipper å taste ting inn på nytt og kan følge med
              over tid. Dette forlater aldri enheten din og sendes ikke til
              oss eller noen andre.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-1">
              Den nasjonale telleren
            </h2>
            <p className="text-muted">
              Beløpet fra hvert stoppede møte legges til en felles,
              anonym sum som vises på forsiden. Det er umulig å spore et
              enkelt beløp tilbake til et bestemt møte, en bedrift eller en
              person – vi lagrer rett og slett ikke den informasjonen i
              utgangspunktet.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-1">Delte møterom</h2>
            <p className="text-muted">
              Alle som åpner en delt møte-lenke ser nøyaktig de samme tallene
              – aldri hvem som er med eller hva møtet handler om. Møterom som
              ikke er avsluttet ryddes automatisk bort etter 12 timer.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg mb-1">Kontakt</h2>
            <p className="text-muted">
              Spørsmål om personvern? Møtebrenneren er et humorprosjekt uten
              persondata å behandle – men si gjerne ifra hvis noe virker
              rart.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
