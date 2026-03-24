import type { Player, MatchSettings, PeriodLineup, PlayerAssignment } from '../types';
import { FORMATIONS, DEFAULT_FORMATION } from './formations';

interface RotationInput {
  players: Player[];
  settings: MatchSettings;
  playersOnField: number;
  formation?: string;
}

function getSubSlots(settings: MatchSettings): { period: number; slot: number }[] {
  const slots: { period: number; slot: number }[] = [];
  const slotsPerPeriod = Math.ceil(settings.period_minutes / settings.sub_interval_minutes);
  for (let p = 1; p <= settings.periods; p++) {
    for (let s = 0; s < slotsPerPeriod; s++) {
      slots.push({ period: p, slot: s });
    }
  }
  return slots;
}

/**
 * Score how well a player fits a position (higher = better).
 */
function positionScore(player: Player, position: string): number {
  if (player.position_1 === position) return 3;
  if (player.position_2 === position) return 2;
  if (player.position_3 === position) return 1;
  return 0;
}

/**
 * Hungarian-style greedy assignment: assign players to slots maximising
 * total position-preference score, breaking ties by player index.
 */
function assignPositions(
  outfield: Player[],
  formation: { slots: { position: string; x: number; y: number }[] },
  gk?: Player
): PlayerAssignment[] {
  const assignments: PlayerAssignment[] = [];
  const usedSlotIdx = new Set<number>();

  // If a dedicated GK is present, assign them to GK slot first
  if (gk) {
    const gkSlot = formation.slots.findIndex(s => s.position === 'GK');
    if (gkSlot >= 0) {
      assignments.push({ player_id: gk.id, position: 'GK', slot_index: gkSlot });
      usedSlotIdx.add(gkSlot);
    }
  }

  // All remaining slots (if no GK, this includes the GK slot too)
  const openSlots = formation.slots
    .map((s, i) => ({ ...s, idx: i }))
    .filter(s => !usedSlotIdx.has(s.idx));

  const remaining = [...outfield];

  // Build score pairs — use ALL open slots (including GK slot when no dedicated GK)
  const pairs: { score: number; pidx: number; sidx: number }[] = [];
  for (let pi = 0; pi < remaining.length; pi++) {
    for (let si = 0; si < openSlots.length; si++) {
      pairs.push({ score: positionScore(remaining[pi], openSlots[si].position), pidx: pi, sidx: si });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const assignedPlayers = new Set<number>();
  const assignedSlots = new Set<number>();

  for (const { pidx, sidx } of pairs) {
    if (assignedPlayers.has(pidx) || assignedSlots.has(sidx)) continue;
    const player = remaining[pidx];
    const slot = openSlots[sidx];
    assignments.push({
      player_id: player.id,
      position: slot.position as import('../types').Position,
      slot_index: slot.idx,
    });
    assignedPlayers.add(pidx);
    assignedSlots.add(sidx);
    if (assignedPlayers.size === Math.min(remaining.length, openSlots.length)) break;
  }

  return assignments;
}

function computeSubstitutions(prev: PeriodLineup, curr: PeriodLineup): PeriodLineup['substitutions'] {
  const prevIds = new Set(prev.on_field.map(a => a.player_id));
  const currIds = new Set(curr.on_field.map(a => a.player_id));
  const goingOff = prev.on_field.filter(a => !currIds.has(a.player_id));
  const comingOn = curr.on_field.filter(a => !prevIds.has(a.player_id));
  return goingOff.flatMap((out, i) => {
    const inn = comingOn[i];
    if (!inn) return [];
    return [{
      out_player_id: out.player_id,
      in_player_id: inn.player_id,
      from_position: out.position,
      to_position: inn.position,
    }];
  });
}

export function generateRotation(input: RotationInput): PeriodLineup[] {
  const { players, settings, playersOnField } = input;
  const formation = FORMATIONS[input.formation || DEFAULT_FORMATION];
  const subSlots = getSubSlots(settings);

  const gk = players.find(p => p.always_goalkeeper);
  const outfield = players.filter(p => !p.always_goalkeeper);
  const spotsNeeded = playersOnField - (gk ? 1 : 0);

  // Weights for play-time equalisation
  const weights: Record<string, number> = {};
  for (const p of outfield) weights[p.id] = p.extra_time ? 1.5 : p.less_time ? 0.5 : 1;

  const accTime: Record<string, number> = {};
  for (const p of outfield) accTime[p.id] = 0;

  const lineups: PeriodLineup[] = [];

  // Shuffle once initially so ties are broken randomly (not by array order)
  const shuffled = [...outfield].sort(() => Math.random() - 0.5);

  for (const { period, slot } of subSlots) {
    // Sort: players with the lowest weighted accumulated time first
    // Ties are broken by the initial random shuffle order
    const sorted = [...shuffled].sort((a, b) => {
      const aScore = accTime[a.id] / weights[a.id];
      const bScore = accTime[b.id] / weights[b.id];
      return aScore - bScore;
    });

    const onFieldOutfield = sorted.slice(0, spotsNeeded);
    const onBench = sorted.slice(spotsNeeded).map(p => p.id);

    const assignments = assignPositions(onFieldOutfield, formation, gk);

    for (const p of onFieldOutfield) accTime[p.id] += settings.sub_interval_minutes;

    lineups.push({ period, sub_slot: slot, on_field: assignments, on_bench: onBench, substitutions: [] });
  }

  for (let i = 1; i < lineups.length; i++) {
    lineups[i].substitutions = computeSubstitutions(lineups[i - 1], lineups[i]);
  }

  return lineups;
}
