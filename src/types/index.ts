export type Foot = 'left' | 'right' | 'both';

export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'DM'
  | 'CM'
  | 'LM'
  | 'RM'
  | 'AM'
  | 'LW'
  | 'RW'
  | 'ST';

export interface Player {
  id: string;
  first_name: string;
  last_name_initial: string;
  full_name: string; // not displayed
  dominant_foot?: Foot;
  position_1: Position;
  position_2?: Position;
  position_3?: Position;
  always_goalkeeper: boolean;
  extra_time?: boolean; // gets more time than average
  less_time?: boolean;  // gets less time than average
  team_id: string;
}

export interface Team {
  id: string;
  name: string;
  players_on_field: number; // default 9
}

export interface MatchSettings {
  periods: number;          // default 3
  period_minutes: number;   // default 25
  sub_interval_minutes: number; // default 12.5
}

export interface Match {
  id: string;
  team_id: string;
  date: string;
  opponent?: string;
  settings: MatchSettings;
  player_ids: string[];     // players in this match
  created_at: string;
}

export interface PositionSlot {
  position: Position;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface Formation {
  name: string;
  slots: PositionSlot[];
}

export interface PlayerAssignment {
  player_id: string;
  position: Position;
  slot_index: number;
}

export interface PeriodLineup {
  period: number;           // 1, 2, 3...
  sub_slot: number;         // within period, 0 = start, 1 = first sub, etc.
  on_field: PlayerAssignment[];
  on_bench: string[];       // player_ids
  substitutions: Substitution[]; // swaps happening at START of this slot
}

export interface Substitution {
  out_player_id: string;
  in_player_id: string;
  from_position: Position;
  to_position: Position;
  // For triangle subs: intermediate player moves
  intermediate?: {
    player_id: string;
    from_position: Position;
    to_position: Position;
  };
}

export interface MatchPlan {
  id: string;
  match_id: string;
  lineups: PeriodLineup[];
  created_at: string;
  updated_at: string;
}
