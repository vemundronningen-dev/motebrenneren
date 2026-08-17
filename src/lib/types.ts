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
