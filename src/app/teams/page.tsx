import type { Metadata } from "next";
import Link from "next/link";
import InviteBotCard from "@/components/InviteBotCard";
import { BOT_EMAIL } from "@/lib/botEmail";

export const metadata: Metadata = {
  title: "Møtebrenneren i Teams",
  description:
    "Legg til Møtebrenneren i møteinvitasjonen, så blir den med i Teams-møtet med kostnaden live på kameraet. Ingen app, ingen installasjon, ingen opptak.",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ember text-lg font-bold text-[#1a0d05]">
        {n}
      </span>
      <div className="min-w-0 pt-1.5">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="mt-1 flex flex-col gap-2 text-base text-muted">{children}</div>
      </div>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-line bg-background-raised px-1.5 py-0.5 text-[0.85em] font-medium text-foreground">
      {children}
    </span>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-foreground">{q}</h3>
      <div className="mt-1 text-muted">{children}</div>
    </div>
  );
}

const IT_MESSAGE = `Hei!

Vi vil bruke Møtebrenneren (motebrenneren.no) i Teams-møtene våre. Den blir med som en ekstern gjest som viser møtekostnaden på kameraet – den tar ikke opp lyd, bilde eller tekst.

For at den skal komme inn, må anonyme deltakere kunne bli med i møter:
Teams admin center → Meetings → Meeting settings og Meeting policies → «Anonymous users can join a meeting» = On.

Takk!`;

export default function TeamsGuidePage() {
  return (
    <main className="flex-1 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold">Møtebrenneren i møtet ditt</h1>
        <p className="mt-3 text-lg text-muted">
          Du inviterer Møtebrenneren som om den var en kollega. Den blir med i møtet og viser hva det
          koster, live på kameraet. Ingen app, ingen installasjon, ingen opptak.
        </p>

        <div className="mt-8">
          <InviteBotCard showGuideLink={false} />
        </div>

        <h2 className="mt-12 text-2xl font-bold">Tre steg – det er alt</h2>
        <ol className="mt-6 flex flex-col gap-8 leading-relaxed">
          <Step n={1} title="Legg til adressen i invitasjonen">
            <p>
              Åpne møtet i Outlook- eller Teams-kalenderen. Skriv <strong>{BOT_EMAIL}</strong> der du
              legger til deltakere – akkurat som en kollega. Trykk <Kbd>Send</Kbd> (eller{" "}
              <Kbd>Send oppdatering</Kbd>).
            </p>
          </Step>
          <Step n={2} title="Få bekreftelse">
            <p>
              Innen et minutt får du en e-post: «🔥 Møtebrenneren kommer». Der står prognosen, og en
              lenke hvor du kan følge med – eller pause og stoppe telleren selv.
            </p>
          </Step>
          <Step n={3} title="Slipp den inn når møtet starter">
            <p>
              «🔥 Møtebrenneren» dukker opp i lobbyen. Trykk <Kbd>Slipp inn</Kbd>. Resten skjer av seg
              selv: telleren starter ved møtestart, viser hver milepæl som brennes, og stopper når alle
              har gått.
            </p>
          </Step>
        </ol>

        <h2 className="mt-14 text-2xl font-bold">Spørsmål</h2>
        <div className="mt-5 flex flex-col gap-6 text-base leading-relaxed">
          <Faq q="Tar den opp møtet?">
            Nei. Den tar ikke opp lyd, bilde eller tekst, og lagrer verken navn, e-postadresser eller
            hva møtet handler om. Den <em>viser</em> bare et kamerabilde med kostnaden.{" "}
            <Link href="/personvern" className="underline">
              Les mer om personvern
            </Link>
            .
          </Faq>
          <Faq q="Hvordan vet den hva møtet koster?">
            Den teller hvor mange som er invitert (møterom og den selv regnes ikke med), og regner 1 000
            kr i timen per person – et nøkternt snitt inkludert sosiale kostnader. Lengden henter den fra
            invitasjonen.
          </Faq>
          <Faq q="Faste møter hver uke?">
            Legg den til i serien én gang, så kommer den hver gang. Avlyser du én forekomst, hopper den
            over den.
          </Faq>
          <Faq q="Hvordan avbestiller jeg?">
            Fjern adressen fra invitasjonen (eller avlys møtet) og send oppdateringen. Da kommer den ikke.
          </Faq>
          <Faq q="Den kom aldri inn i møtet">
            <p>
              Noen bedrifter har stengt for eksterne gjester i Teams-møter. Da må IT åpne for det. Du kan
              sende dem denne meldingen:
            </p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-background-raised p-4 text-sm text-foreground">
              {IT_MESSAGE}
            </pre>
            <p className="mt-2">
              <a
                href={`mailto:?subject=${encodeURIComponent("Kan vi slippe Møtebrenneren inn i Teams-møter?")}&body=${encodeURIComponent(IT_MESSAGE)}`}
                className="font-semibold text-foreground underline"
              >
                ✉️ Åpne som e-post til IT
              </a>
            </p>
          </Faq>
          <Faq q="Virker det med Zoom og Google Meet også?">
            Ja – Teams, Zoom, Google Meet og Webex. Fremgangsmåten er den samme.
          </Faq>
        </div>

        <details className="mt-14 rounded-2xl border border-line bg-background-raised p-5 text-sm leading-relaxed">
          <summary className="cursor-pointer text-base font-semibold text-foreground">
            Alternativ for teknisk interesserte: eget virtuelt kamera med OBS
          </summary>
          <div className="mt-4 flex flex-col gap-3 text-muted">
            <p>
              Hvis gjester ikke slipper inn i dine møter, kan du sende kameravisningen inn selv med
              gratisprogrammet OBS Studio:
            </p>
            <ol className="list-decimal pl-5 flex flex-col gap-2">
              <li>
                Installer OBS fra{" "}
                <a href="https://obsproject.com" target="_blank" rel="noopener noreferrer" className="underline">
                  obsproject.com
                </a>{" "}
                og sett video til <Kbd>1280x720</Kbd> under <Kbd>Innstillinger</Kbd> → <Kbd>Video</Kbd>.
              </li>
              <li>
                Del et møte på <Link href="/start" className="underline">motebrenneren.no/start</Link> og
                trykk <Kbd>📹 Åpne Teams-kameravisning</Kbd>. Kopier adressen.
              </li>
              <li>
                I OBS: <Kbd>Kilder</Kbd> → <Kbd>+</Kbd> → <Kbd>Nettleser</Kbd>, lim inn adressen, bredde
                1280, høyde 720. Trykk <Kbd>Start virtuelt kamera</Kbd>.
              </li>
              <li>
                I Teams: velg <Kbd>OBS Virtual Camera</Kbd> som kamera – eller bli med en ekstra gang fra
                Chrome/Edge som «🔥 Møtebrenneren» med lyd av.
              </li>
            </ol>
          </div>
        </details>
      </div>
    </main>
  );
}
