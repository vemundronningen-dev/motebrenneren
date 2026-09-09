export type MeetingStatus = "lobby" | "running" | "paused" | "ended";

export interface RoleDef {
  id: string;
  name: string;
  defaultRate: number;
  isEasterEgg?: boolean;
}

export interface CustomRole {
  id: string;
  name: string;
  rate: number;
}

export interface Participant {
  roleId: string;
  name: string;
  rate: number;
  count: number;
  isCustom: boolean;
}

/** Trygg, offentlig representasjon av et live_meetings-møte (uten host_token). */
export interface PublicMeeting {
  id: string;
  slug: string;
  started_at: string | null;
  estimated_seconds: number;
  rate_per_hour: number;
  participants: number;
  status: MeetingStatus;
  paused_total_seconds: number;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  /** Antall aktive seere siste ~25 sek, basert på heartbeat-tabellen. */
  viewer_count: number;
  /** Valgfritt møtenavn/-type (f.eks. "Salgsmøte") - aldri agenda/tittel. */
  label: string | null;
  /**
   * Satt når møtet avsluttes - den faktiske varigheten/beløpet som telles,
   * som kan være kortere enn started_at→ended_at hvis verten korrigerte
   * for at møtet sto åpent lenge etter at det egentlig var ferdig. Bruk
   * disse (ikke started_at/ended_at) for å vise et avsluttet møtes
   * resultat - null mens møtet fortsatt pågår.
   */
  final_duration_seconds: number | null;
  final_amount: number | null;
  /**
   * Valgfri anslått verdi av saken/anskaffelsen møtet skal avgjøre, i kr.
   * Brukes til å benchmarke møtekostnaden mot selve beslutningen - typisk
   * eksempel: ti konsulenter i timevis for å avgjøre hulltaking av ti hull
   * i et bygg til 5 000 kr.
   */
  case_value: number | null;
}

export interface NationalStats {
  total_sum: number;
  total_meetings: number;
  meetings_today: number;
  sum_last_24h: number;
  avg_cost: number;
  pct_over_time: number;
}

export interface MeetingSetup {
  participants: Participant[];
  estimatedSeconds: number;
  ratePerHour: number;
  totalParticipants: number;
}
