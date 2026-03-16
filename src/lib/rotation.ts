import type { Player, MatchSettings, PeriodLineup, PlayerAssignment } from '../types';
import { FORMATIONS, DEFAULT_FORMATION } from './formations';

interface RotationInput {
  players: Player[];
  settings: MatchSettings;
  playersOnField: number;
  formation?: string;
}

/**
 * Calculate total sub-slots across all periods.
 * Each period has ceil(period_minutes / sub_interval_minutes) slots.
 */
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
 * Assign players to sub-slots trying to equalize playing time.
 * Players with extra_time get +1 slot weight, less_time get -1.
 * Goalkeepers are always on field.
 */
export function generateRotation(input: RotationInput): PeriodLineup[] {
  const { players, settings, playersOnField } = input;
  const formation = FORMATIONS[input.formation || DEFAULT_FORMATION];
  const subSlots = getSubSlots(settings);

  const gk = players.find(p => p.always_goalkeeper);
  const outfield = players.filter(p => !p.always_goalkeeper);
  const spotsNeeded = playersOnField - (gk ? 1 : 0);

  // Target play time weights
  const weights: Record<string, number> = {};
  for (const p of outfield) {
    weights[p.id] = p.extra_time ? 1.5 : p.less_time ? 0.5 : 1;
  }

  // Greedy: each slot, pick the outfield players with lowest accumulated time
  const accTime: Record<string, number> = {};
  for (const p of outfield) accTime[p.id] = 0;

  const lineups: PeriodLineup[] = [];

  for (const { period, slot } of subSlots) {
    // Sort by weighted deficit: want those with least relative time
    const sorted = [...outfield].sort((a, b) => {
      const aRel = accTime[a.id] / weights[a.id];
      const bRel = accTime[b.id] / weights[b.id];
      return aRel - bRel;
    });

    const onFieldOutfield = sorted.slice(0, spotsNeeded);
    const onBench = sorted.slice(spotsNeeded).map(p => p.id);

    // Assign positions based on preferences
    const assignments: PlayerAssignment[] = assignPositions(onFieldOutfield, formation, gk);

    // Accumulate time
    for (const p of onFieldOutfield) accTime[p.id] += settings.sub_interval_minutes;

    lineups.push({
      period,
      sub_slot: slot,
      on_field: assignments,
      on_bench: [...onBench, ...(gk ? [] : [])],
      substitutions: [], // filled in next step
    });
  }

  // Compute substitutions between consecutive slots
  for (let i = 1; i < lineups.length; i++) {
    const prev = lineups[i - 1];
    const curr = lineups[i];
    lineups[i].substitutions = computeSubstitutions(prev, curr);
  }

  return lineups;
}

function assignPositions(
  outfield: Player[],
  formation: { slots: { position: string; x: number; y: number }[] },
  gk?: Player
): PlayerAssignment[] {
  const assignments: PlayerAssignment[] = [];
  const slots = [...formation.slots];

  if (gk) {
    const gkSlot = slots.findIndex(s => s.position === 'GK');
    if (gkSlot >= 0) {
      assignments.push({ player_id: gk.id, position: 'GK', slot_index: gkSlot });
      slots.splice(gkSlot, 1);
    }
  }

  const outfieldSlots = slots.filter(s => s.position !== 'GK');
  const remaining = [...outfield];

  // Greedy match: for each slot, find best player by preference
  for (let i = 0; i < outfieldSlots.length && remaining.length > 0; i++) {
    const slot = outfieldSlots[i];
    const slotIdx = formation.slots.findIndex(s => s === slot);

    // Score each remaining player for this slot
    const scored = remaining.map(p => {
      let score = 0;
      if (p.position_1 === slot.position) score = 3;
      else if (p.position_2 === slot.position) score = 2;
      else if (p.position_3 === slot.position) score = 1;
      return { p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].p;
    assignments.push({ player_id: best.id, position: slot.position as import('../types').Position, slot_index: slotIdx });
    remaining.splice(remaining.indexOf(best), 1);
  }

  return assignments;
}

function computeSubstitutions(prev: PeriodLineup, curr: PeriodLineup): PeriodLineup['substitutions'] {
  const prevIds = new Set(prev.on_field.map(a => a.player_id));
  const currIds = new Set(curr.on_field.map(a => a.player_id));

  const goingOff = prev.on_field.filter(a => !currIds.has(a.player_id));
  const comingOn = curr.on_field.filter(a => !prevIds.has(a.player_id));

  return goingOff.map((out, i) => {
    const inn = comingOn[i];
    if (!inn) return null;
    return {
      out_player_id: out.player_id,
      in_player_id: inn.player_id,
      from_position: out.position,
      to_position: inn.position,
    };
  }).filter(Boolean) as ReturnType<typeof computeSubstitutions>;
}
