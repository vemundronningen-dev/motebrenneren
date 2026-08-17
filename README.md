# 🔥 Møtebrenneren

En norsk møtekostnad-kalkulator som viser hvor mye et møte koster i
sanntid — med delbare live-møterom for Teams-kolleger, en brennende
tidslinje, og en nasjonal teller som viser hvor mye Norge totalt har
brent i møter.

Bygget med Next.js (App Router), [Neon](https://neon.tech) (serverless
Postgres) og Tailwind CSS.

## Innholdsfortegnelse

- [Kom i gang lokalt](#kom-i-gang-lokalt)
- [Database-oppsett (Neon)](#database-oppsett-neon)
- [Miljøvariabler](#miljøvariabler)
- [Arkitektur i korte trekk](#arkitektur-i-korte-trekk)
- [Deploy til Vercel](#deploy-til-vercel)

## Kom i gang lokalt

```bash
npm install
cp .env.local.example .env.local
# fyll inn DATABASE_URL, se "Database-oppsett" under
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Database-oppsett (Neon)

1. Opprett et prosjekt på [neon.tech](https://neon.tech) (eller bruk et
   eksisterende).
2. Kopier connection-strengen fra dashboardet (**Connection Details**).
   Bruk gjerne varianten med `-pooler` i vertsnavnet – hver spørring går
   uansett over HTTP (se arkitektur-notatet under), så pooling-egenskapen
   i seg selv spiller mindre rolle her.
3. Kjør migrasjonene i `db/migrations/`, i rekkefølge:

   ```bash
   psql "$DATABASE_URL" -f db/migrations/0001_init.sql
   psql "$DATABASE_URL" -f db/migrations/0002_meeting_label.sql
   ```

   Har du ikke `psql` installert kan du i stedet lime hele innholdet i
   hver fil inn i Neon sitt **SQL Editor** i dashboardet og trykke Run,
   én fil om gangen i nummerrekkefølge.

4. Legg connection-strengen inn som `DATABASE_URL` i `.env.local` (lokalt)
   og i Vercel sine miljøvariabler (produksjon/preview).

### Hva skjemaet setter opp

- **`burns`** – én rad per fullført møteforbrenning som teller mot den
  nasjonale telleren. Ingen navn, ingen agenda – bare beløp, varighet,
  deltakerantall, tidspunkt, og en valgfri kort møtetype (`label`, f.eks.
  "Salgsmøte") brukeren selv kan sette for å spore hva slags møter som
  koster mest.
- **`live_meetings`** – delte møterom, inkl. den hemmelige
  `host_token`-kolonnen som styrer hvem som kan starte/pause/stoppe.
- **`meeting_presence`** – enkel heartbeat-tabell brukt til å telle
  "kolleger som ser på" (se under).

### Sikkerhetsmodell

Databasen er **ikke** direkte tilgjengelig fra nettleseren (i motsetning
til f.eks. Supabase sin PostgREST + RLS-modell). `DATABASE_URL` er en
fulltillitt hemmelighet som kun leses server-side, i
`src/lib/db/client.ts` (beskyttet med pakken `server-only`, som gir en
build-feil hvis noen ved en feil prøver å importere den fra en
`"use client"`-fil). All lesing og skriving går via Next.js sine
API-ruter, som selv står for hele sikkerhetsmodellen:

- `host_token` returneres aldri i noe JSON-svar – `toPublic()` i
  `src/lib/meetings.ts` bygger alltid et eksplisitt, begrenset objekt.
- Statusendringer (start/pause/resume/stopp) verifiserer `host_token`
  server-side i `POST /api/meetings/[slug]/action` før noe skrives.
- Beløp som telles mot den nasjonale telleren klippes server-side til
  maks 3000 kr/t per deltaker, uansett hva klienten sender inn (se
  `src/lib/burns.ts`).
- Møterom eldre enn 12 timer avsluttes lazy (ingen cron) – se
  `cleanupIfAbandoned` i `src/lib/meetings.ts`, som kjører hver gang et
  møte leses.

### Om sanntid (og hvorfor det er polling, ikke push)

Ren Postgres/Neon har ikke noe innebygd pub/sub- eller
websocket-lag slik Supabase Realtime har. Derfor:

- **Nasjonaltelleren** henter ferske tall fra `/api/stats` hvert 7.
  sekund, og fortsetter å tikke jevnt oppover lokalt mellom hver
  henting (basert på kr/sekund fra siste 24t) – det merkes ikke som et
  hopp i praksis.
- **Delte møterom** poller `/api/meetings/[slug]` hvert 3. sekund for
  statusendringer. Selve kr-telleren er upåvirket av dette: den regnes
  lokalt 10 ganger i sekundet ut fra `started_at` / `paused_at` /
  `status` (server-tid) for det enkelte møtet, så alle ser identisk
  beløp uansett nettverkslag – pollingen trengs kun for å oppdage at
  verten har trykket pause/stopp.
- **"👀 X kolleger ser på"** er en enkel heartbeat: hver åpne fane
  sender et `POST /api/meetings/[slug]/heartbeat` hvert 10. sekund, og
  "antall som ser på" = antall rader i `meeting_presence` med
  `last_seen` nyere enn 25 sekunder.

Ønsker du ekte push senere (kortere forsinkelse, ingen polling), er det
naturlige stedet å legge det til et eget sanntids-lag (f.eks. Pusher,
Ably, eller Neon sin egen `LISTEN/NOTIFY` via en langlevd
tilkobling/WebSocket-tjeneste ved siden av Vercel-funksjonene) – det er
ikke noe i denne arkitekturen som er i veien for det.

## Miljøvariabler

| Variabel | Hvor den brukes | Offentlig? |
| --- | --- | --- |
| `DATABASE_URL` | Kun server (`src/lib/db/client.ts`) | **Nei – aldri i nettleseren** |

## Arkitektur i korte trekk

- **Solo-flyt** (`/start`): alt skjer client-side i én
  tilstandsmaskin (`setup → live → summary`). Ved stopp sendes ett
  enkelt kall til `POST /api/burns`.
- **Delt møte** (`/m/[slug]`): opprettes via `POST /api/meetings`.
  Verten får en hemmelig `hostToken` lagret i `localStorage`
  (`src/lib/hostToken.ts`) og er eneste som kan trykke
  start/pause/stopp (`POST /api/meetings/[slug]/action`, som
  verifiserer token server-side). Ved stopp inserer *serveren* (ikke
  hver seer) beløpet i `burns` – garantert maks én innsending per møte
  via en atomisk statusoppdatering (`where status <> 'ended'`).
- **Nasjonaltelleren** (forsiden): henter aggregerte tall server-side
  ved lasting, og animerer jevnt oppover basert på kr/sekund fra siste
  24t, med periodisk resync (se over).
- **Juksebeskyttelse**: lokale/egendefinerte rater i kalkulatoren kan
  være hva som helst og påvirker kun brukerens egen visning. Alt som
  faktisk telles mot Norges-telleren klippes server-side til maks
  3000 kr/t per deltaker (`src/lib/burns.ts`).
- **Møtetype/-navn**: valgfritt felt i oppsettet (`src/components/MeetingLabelPicker.tsx`)
  med hurtigvalg (Allmøte, Salgsmøte, Statusmøte m.fl.) eller fritekst,
  lagres som `label` på både `live_meetings` og `burns`. Vises på
  live-skjermen, i lobbyen, i delingstekst/-bilde og i OG-tittelen.
- **Lokal møtehistorikk** (`/historikk`): hver fullførte oppsummering
  lagres i `localStorage` (`src/lib/useMeetingHistory.ts`) med beløp,
  møtetype, varighet og dato - kun i den enkelte nettleseren, aldri på
  serveren. Gir en enkel personlig oversikt gruppert på møtetype, uten
  behov for innlogging.

## Deploy til Vercel

1. Push repoet til GitHub.
2. Importer prosjektet i [Vercel](https://vercel.com/new).
3. Legg inn `DATABASE_URL` (Production + Preview).
4. Deploy. Ingen ekstra build-steg trengs – `next build` er nok.
5. Pek `motebrenneren.no` (eller din egen domene) til Vercel-prosjektet
   under **Domains**.

---

_Ratene er grove estimater av total timekostnad. Ikke sint, bare
skuffet._
