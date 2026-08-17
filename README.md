# 🔥 Møtebrenneren

En norsk møtekostnad-kalkulator som viser hvor mye et møte koster i
sanntid — med delbare live-møterom for Teams-kolleger, en brennende
tidslinje, og en nasjonal teller som viser hvor mye Norge totalt har
brent i møter.

Bygget med Next.js (App Router), Supabase (Postgres + Realtime +
Presence) og Tailwind CSS.

## Innholdsfortegnelse

- [Kom i gang lokalt](#kom-i-gang-lokalt)
- [Supabase-oppsett](#supabase-oppsett)
- [Miljøvariabler](#miljøvariabler)
- [Arkitektur i korte trekk](#arkitektur-i-korte-trekk)
- [Deploy til Vercel](#deploy-til-vercel)

## Kom i gang lokalt

```bash
npm install
cp .env.local.example .env.local
# fyll inn variablene, se "Miljøvariabler" under
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Supabase-oppsett

1. Opprett et nytt prosjekt på [supabase.com](https://supabase.com).
2. Kjør migrasjonen i `supabase/migrations/0001_init.sql`. To måter:

   **A) Supabase CLI (anbefalt)**

   ```bash
   npx supabase login
   npx supabase link --project-ref <ditt-prosjekt-ref>
   npx supabase db push
   ```

   **B) SQL Editor i dashboardet**

   Åpne prosjektet ditt → SQL Editor → lim inn hele innholdet i
   `supabase/migrations/0001_init.sql` → Run.

3. Sjekk at Realtime er aktivert for prosjektet (Database → Replication).
   Migrasjonen legger selv til `burns` og `live_meetings` i
   `supabase_realtime`-publikasjonen.

### Hva migrasjonen setter opp

- **`burns`** – én rad per fullført møteforbrenning som teller mot den
  nasjonale telleren. `anon`-rollen kan kun *inserte* (via
  `/api/burns`), aldri lese enkeltrader.
- **`live_meetings`** – delte møterom. `anon` kan lese via slug, men
  `host_token`-kolonnen er eksplisitt utelatt fra kolonne-grantene til
  `anon`, så den kan aldri hentes ut av en klient uansett RLS-policy.
  All opprettelse og alle statusendringer (start/pause/resume/stopp)
  skjer via API-ruter som bruker `service_role`-nøkkelen og
  verifiserer `host_token` i applikasjonskode.
- **`get_national_stats()`** – `security definer`-funksjon som er
  eneste vei `anon` har til aggregerte tall (total sum, antall møter,
  siste 24t, snittkostnad, andel over tid).
- Sanntid mellom klienter går via **Supabase Realtime Broadcast**
  (`channel.httpSend(...)`), ikke `postgres_changes` — se kommentaren
  i `src/lib/realtime.ts` for hvorfor (kort versjon: RLS er
  radnivå, ikke kolonnenivå, så `postgres_changes` ville i praksis
  kunne lekke `host_token` til alle som kan se raden).
- Møterom eldre enn 12 timer avsluttes lazy (ingen cron) – se
  `cleanupIfAbandoned` i `src/lib/meetings.ts`, som kjører hver gang
  et møte leses.

## Miljøvariabler

| Variabel | Hvor den brukes | Offentlig? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Nettleser + server | Ja |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Nettleser + server | Ja |
| `SUPABASE_SERVICE_ROLE_KEY` | Kun API-rutene under `src/app/api/meetings/**` | **Nei – aldri i nettleseren** |

`SUPABASE_SERVICE_ROLE_KEY` er ikke nevnt i den offentlige
NEXT_PUBLIC-listen, men er nødvendig for at vert-token-modellen for
delte møter skal kunne verifiseres trygt server-side (se
`src/lib/supabase/server.ts` – filen bruker pakken `server-only` for å
garantere at den aldri kan importeres i klientkode). Nøkkelen finner
du i Supabase-dashboardet under **Project Settings → API →
service_role**.

Sett alle tre i `.env.local` lokalt, og i **Vercel → Project Settings
→ Environment Variables** for produksjon/preview.

## Arkitektur i korte trekk

- **Solo-flyt** (`/start`): alt skjer client-side i én
  tilstandsmaskin (`setup → live → summary`). Ved stopp sendes ett
  enkelt kall til `POST /api/burns`.
- **Delt møte** (`/m/[slug]`): opprettes via `POST /api/meetings`.
  Verten får en hemmelig `hostToken` lagret i `localStorage`
  (`src/lib/hostToken.ts`) og er eneste som kan trykke
  start/pause/stopp (`POST /api/meetings/[slug]/action`, som
  verifiserer token server-side). Alle klienter beregner selv
  kostnaden lokalt ut fra `started_at` / `paused_total_seconds` /
  `status` (server-tid) — vi strømmer aldri selve tallet, kun
  statusendringer, så alle viser identisk beløp uansett nettverkslag.
  Ved stopp inserer *serveren* (ikke hver seer) beløpet i `burns` –
  garantert maks én innsending per møte via en atomisk
  statusoppdatering (`neq('status','ended')`).
- **Nasjonaltelleren** (forsiden): henter `get_national_stats()`
  server-side ved lasting, og animerer jevnt oppover basert på
  kr/sekund fra siste 24t. Hver gang et møte stoppes noe sted i
  Norge kringkastes beløpet på en `national-counter`-broadcastkanal,
  og telleren hopper i sanntid.
- **Juksebeskyttelse**: lokale/egendefinerte rater i kalkulatoren kan
  være hva som helst og påvirker kun brukerens egen visning. Alt som
  faktisk telles mot Norges-telleren klippes server-side til maks
  3000 kr/t per deltaker (`src/lib/burns.ts`).

## Deploy til Vercel

1. Push repoet til GitHub.
2. Importer prosjektet i [Vercel](https://vercel.com/new).
3. Legg inn de tre miljøvariablene fra tabellen over (Production +
   Preview).
4. Deploy. Ingen ekstra build-steg trengs – `next build` er nok.
5. Pek `motebrenneren.no` (eller din egen domene) til Vercel-prosjektet
   under **Domains**.

---

_Ratene er grove estimater av total timekostnad. Ikke sint, bare
skuffet._
