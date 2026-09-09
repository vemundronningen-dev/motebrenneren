-- Møtebrenneren – valgfri "verdi av saken som skal avgjøres" (f.eks. en
-- anskaffelse), slik at møtekostnaden kan benchmarkes mot det faktiske
-- beslutningsgrunnlaget. Klassikeren: ti konsulenter i timevis for å
-- avgjøre hulltaking av ti hull i et bygg til 5 000 kr.
--
-- Kjør med:
--   psql "$DATABASE_URL" -f db/migrations/0004_case_value.sql

alter table live_meetings
  add column if not exists case_value numeric check (case_value >= 0);

alter table burns
  add column if not exists case_value numeric check (case_value >= 0);
