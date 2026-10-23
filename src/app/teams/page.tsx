import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Møtebrenneren i Teams",
  description:
    "Få Møtebrenneren inn i Teams-møtet som en egen deltaker, med et kamera som viser kostnad, løpetid og milepæler live.",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember text-sm font-bold text-[#1a0d05]">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="mt-1 flex flex-col gap-2 text-muted">{children}</div>
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

export default function TeamsGuidePage() {
  return (
    <main className="flex-1 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Møtebrenneren som deltaker i Teams</h1>
        <p className="mt-2 text-muted">
          Møtebrenneren kan bli med i Teams-møtet som en egen deltaker, med et
          &quot;kamera&quot; som alltid står på og viser hva møtet koster,
          hvor lenge det har vart, og hver milepæl som brennes – live, for
          alle.
        </p>

        <div className="mt-6 rounded-2xl border border-ember/30 bg-ember/[0.06] p-4 text-sm text-muted">
          <p>
            <span className="font-semibold text-foreground">Slik virker det:</span>{" "}
            hvert delte møte har en egen kameravisning (lenke som slutter på{" "}
            <code className="text-foreground">/kamera</code>). Gratisprogrammet
            OBS Studio gjør den om til et webkamera, og så blir du med i
            Teams-møtet en ekstra gang med det kameraet – som deltakeren
            &quot;🔥 Møtebrenneren&quot;.
          </p>
        </div>

        <h2 className="mt-10 text-xl font-bold">Engangsoppsett (ca. 10 minutter)</h2>
        <ol className="mt-4 flex flex-col gap-6 text-sm leading-relaxed">
          <Step n={1} title="Installer OBS Studio">
            <p>
              Last ned gratis fra{" "}
              <a
                href="https://obsproject.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline"
              >
                obsproject.com
              </a>{" "}
              (Windows eller Mac) og installer som et vanlig program.
            </p>
          </Step>
          <Step n={2} title="Sett bildet til 1280 × 720">
            <p>
              Åpne OBS. Dukker det opp en veiviser, velg{" "}
              <Kbd>Optimaliser kun for virtuelt kamera</Kbd>. Ellers: gå til{" "}
              <Kbd>Innstillinger</Kbd> → <Kbd>Video</Kbd> og sett både
              grunnoppløsning og utdataoppløsning til <Kbd>1280x720</Kbd>.
            </p>
          </Step>
          <Step n={3} title="Legg til Møtebrenneren som kilde">
            <p>
              Nederst under <Kbd>Kilder</Kbd>: trykk <Kbd>+</Kbd> →{" "}
              <Kbd>Nettleser</Kbd>, og kall den &quot;Møtebrenneren&quot;. Sett
              bredde <Kbd>1280</Kbd> og høyde <Kbd>720</Kbd>. URL-feltet fyller du
              inn i steg 6 – lim inn hva som helst for nå.
            </p>
          </Step>
          <Step n={4} title="Start det virtuelle kameraet">
            <p>
              Trykk <Kbd>Start virtuelt kamera</Kbd> nederst til høyre i OBS. På
              Mac må du godkjenne en systemutvidelse første gang (krever macOS 13
              eller nyere).
            </p>
          </Step>
        </ol>

        <h2 className="mt-10 text-xl font-bold">Hver gang du har møte</h2>
        <ol className="mt-4 flex flex-col gap-6 text-sm leading-relaxed">
          <Step n={5} title="Del møtet i Møtebrenneren">
            <p>
              Sett opp møtet på{" "}
              <Link href="/start" className="text-foreground underline">
                motebrenneren.no/start
              </Link>{" "}
              og trykk <Kbd>Del møtet med kollegaer</Kbd>. I delingsboksen trykker
              du <Kbd>📹 Åpne Teams-kameravisning</Kbd> og kopierer adressen fra
              adressefeltet.
            </p>
          </Step>
          <Step n={6} title="Lim lenken inn i OBS">
            <p>
              Dobbeltklikk på &quot;Møtebrenneren&quot;-kilden i OBS og lim inn
              kamera-lenken i URL-feltet. Nå ser du Møtebrenneren i
              forhåndsvisningen.
            </p>
          </Step>
          <Step n={7} title="Bli med i Teams-møtet som Møtebrenneren">
            <p>
              Åpne Teams-møtelenken i <strong>Chrome eller Edge</strong> (ikke i
              Teams-appen) og velg <Kbd>Fortsett i denne nettleseren</Kbd>. Skriv
              navnet <Kbd>🔥 Møtebrenneren</Kbd>, velg{" "}
              <Kbd>OBS Virtual Camera</Kbd> som kamera, og <strong>slå av mikrofon
              og høyttaler</strong> (ellers får dere ekko). Trykk{" "}
              <Kbd>Bli med nå</Kbd>.
            </p>
            <p>
              Selv blir du med som vanlig i Teams-appen. Da er dere to deltakere fra
              samme maskin – helt normalt.
            </p>
          </Step>
          <Step n={8} title="Fest Møtebrenneren på skjermen">
            <p>
              I Teams: høyreklikk Møtebrenneren-ruta → <Kbd>Fest</Kbd> (bare for
              deg) eller <Kbd>Sett i søkelyset for alle</Kbd> (krever at du er
              arrangør) – så ser alle tallet stort.
            </p>
          </Step>
        </ol>

        <h2 className="mt-10 text-xl font-bold">Hvis noe ikke virker</h2>
        <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-foreground">
              Organisasjonen tillater ikke gjester:
            </span>{" "}
            bruk en annen Teams-konto eller en annen PC/Mac for Møtebrenneren –
            eller velg <Kbd>OBS Virtual Camera</Kbd> som ditt eget kamera i Teams
            (da viser ruta di Møtebrenneren i stedet for deg).
          </p>
          <p>
            <span className="font-semibold text-foreground">
              &quot;OBS Virtual Camera&quot; dukker ikke opp:
            </span>{" "}
            sjekk at du har trykket <Kbd>Start virtuelt kamera</Kbd> i OBS, og
            last Teams-siden på nytt.
          </p>
          <p>
            <span className="font-semibold text-foreground">Teksten er speilvendt:</span>{" "}
            det er bare din egen forhåndsvisning. De andre i møtet ser den riktig
            vei.
          </p>
          <p>
            <span className="font-semibold text-foreground">Vil ikke installere OBS?</span>{" "}
            Åpne kameravisningen i et eget nettleservindu og bruk{" "}
            <Kbd>Del</Kbd> → <Kbd>Vindu</Kbd> i Teams. Det fungerer, men da
            opptar Møtebrenneren skjermdelingen.
          </p>
        </div>
      </div>
    </main>
  );
}
