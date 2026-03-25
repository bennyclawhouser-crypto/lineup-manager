import type { Player, MatchSettings, PeriodLineup, PlayerAssignment } from '../types';
import { FORMATIONS, DEFAULT_FORMATION } from './formations';

export interface RotationInput {
  players: Player[];
  settings: MatchSettings;
  playersOnField: number;
  formation?: string;
  /** Max fraction of on-field players (excl GK) allowed to change slot across the whole match. Default 0.25 */
  maxPositionChangeFraction?: number;
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

function positionScore(player: Player, position: string): number {
  if (player.position_1 === position) return 3;
  if (player.position_2 === position) return 2;
  if (player.position_3 === position) return 1;
  return 0;
}

/**
 * Assign players to slots using greedy preference matching.
 * When `lockedSlots` is provided, players already on-field keep their current
 * slot (no unnecessary position shuffling).
 */
function assignPositions(
  onFieldPlayers: Player[],
  formation: { slots: { position: string; x: number; y: number }[] },
  gk: Player | undefined,
  /** slot_index → player_id for players who are staying on and should keep their slot */
  lockedSlots: Map<number, string> = new Map()
): PlayerAssignment[] {
  const assignments: PlayerAssignment[] = [];
  const usedSlotIdx = new Set<number>();
  const usedPlayerIds = new Set<string>();

  // GK first
  if (gk) {
    const gkSlot = formation.slots.findIndex(s => s.position === 'GK');
    if (gkSlot >= 0) {
      assignments.push({ player_id: gk.id, position: 'GK', slot_index: gkSlot });
      usedSlotIdx.add(gkSlot);
      usedPlayerIds.add(gk.id);
    }
  }

  // Honour locked slots: players staying on keep their old position
  for (const [slotIdx, playerId] of lockedSlots.entries()) {
    if (usedSlotIdx.has(slotIdx) || usedPlayerIds.has(playerId)) continue;
    const slot = formation.slots[slotIdx];
    if (!slot) continue;
    assignments.push({
      player_id: playerId,
      position: slot.position as import('../types').Position,
      slot_index: slotIdx,
    });
    usedSlotIdx.add(slotIdx);
    usedPlayerIds.add(playerId);
  }

  // Remaining players (new substitutes) get best available slot by preference
  const openSlots = formation.slots
    .map((s, i) => ({ ...s, idx: i }))
    .filter(s => !usedSlotIdx.has(s.idx));

  const remaining = onFieldPlayers.filter(p => !usedPlayerIds.has(p.id));

  const pairs: { score: number; pidx: number; sidx: number }[] = [];
  for (let pi = 0; pi < remaining.length; pi++) {
    for (let si = 0; si < openSlots.length; si++) {
      pairs.push({ score: positionScore(remaining[pi], openSlots[si].position), pidx: pi, sidx: si });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const assignedP = new Set<number>(), assignedS = new Set<number>();
  for (const { pidx, sidx } of pairs) {
    if (assignedP.has(pidx) || assignedS.has(sidx)) continue;
    const player = remaining[pidx];
    const slot = openSlots[sidx];
    assignments.push({ player_id: player.id, position: slot.position as import('../types').Position, slot_index: slot.idx });
    assignedP.add(pidx); assignedS.add(sidx);
    if (assignedP.size === Math.min(remaining.length, openSlots.length)) break;
  }

  // Post-process: swap pairs to maximise total preference score
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i];
        const b = assignments[j];
        if (a.position === 'GK' || b.position === 'GK') continue;
        const pa = remaining.find(p => p.id === a.player_id);
        const pb = remaining.find(p => p.id === b.player_id);
        if (!pa || !pb) continue;
        const curr = positionScore(pa, a.position) + positionScore(pb, b.position);
        const swap = positionScore(pa, b.position) + positionScore(pb, a.position);
        if (swap > curr) {
          const tmpPos = a.position;
          const tmpSlot = a.slot_index;
          assignments[i] = { ...a, position: b.position, slot_index: b.slot_index };
          assignments[j] = { ...b, position: tmpPos, slot_index: tmpSlot };
          improved = true;
        }
      }
    }
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
    return [{ out_player_id: out.player_id, in_player_id: inn.player_id, from_position: out.position, to_position: inn.position }];
  });
}

export function generateRotation(input: RotationInput): PeriodLineup[] {
  const { players, settings, playersOnField } = input;
  const formation = FORMATIONS[input.formation || DEFAULT_FORMATION];
  const maxChangeFraction = input.maxPositionChangeFraction ?? 0.25;
  const subSlots = getSubSlots(settings);

  const gk = players.find(p => p.always_goalkeeper);
  const outfield = players.filter(p => !p.always_goalkeeper);
  const spotsNeeded = playersOnField - (gk ? 1 : 0);

  // Max number of outfield players allowed to change position across whole match
  const maxPositionChangers = Math.max(1, Math.round(spotsNeeded * maxChangeFraction));

  const weights: Record<string, number> = {};
  for (const p of outfield) weights[p.id] = p.extra_time ? 1.5 : p.less_time ? 0.5 : 1;

  const accTime: Record<string, number> = {};
  for (const p of outfield) accTime[p.id] = 0;

  // Track which players have changed position at least once (unique count)
  const playersWhoChanged = new Set<string>();

  const shuffled = [...outfield].sort(() => Math.random() - 0.5);
  const lineups: PeriodLineup[] = [];

  for (const { period, slot } of subSlots) {
    const sorted = [...shuffled].sort((a, b) =>
      (accTime[a.id] / weights[a.id]) - (accTime[b.id] / weights[b.id])
    );

    const onFieldOutfield = sorted.slice(0, spotsNeeded);
    const onBench = sorted.slice(spotsNeeded).map(p => p.id);

    // Build locked slots: players on field in previous slot keep their position
    // unless they have already used their position-change allowance
    const lockedSlots = new Map<number, string>();
    if (lineups.length > 0) {
      const prev = lineups[lineups.length - 1];
      const newOnFieldIds = new Set(onFieldOutfield.map(p => p.id));
      // Players staying on field — lock their current slot
      const staying = prev.on_field.filter(a => newOnFieldIds.has(a.player_id));
      for (const a of staying) {
        lockedSlots.set(a.slot_index, a.player_id);
      }
      // Incoming subs: they take the slot of the player they replace (slot stays open)
      const goingOffSlots = prev.on_field
        .filter(a => !newOnFieldIds.has(a.player_id))
        .map(a => a.slot_index);
      for (const slotIdx of goingOffSlots) {
        lockedSlots.delete(slotIdx);
      }

      // Check if too many players have changed position — if so, keep everyone locked
      // (no reshuffling beyond max allowed changers)
      const wouldChangeCount = playersWhoChanged.size;
      if (wouldChangeCount >= maxPositionChangers) {
        // Lock all staying players unconditionally
        for (const a of staying) {
          lockedSlots.set(a.slot_index, a.player_id);
        }
      }
    }

    const assignments = assignPositions(onFieldOutfield, formation, gk, lockedSlots);

    // Track unique players who changed position
    if (lineups.length > 0) {
      const prev = lineups[lineups.length - 1];
      for (const a of assignments) {
        const prevA = prev.on_field.find(p => p.player_id === a.player_id);
        if (prevA && prevA.slot_index !== a.slot_index) {
          playersWhoChanged.add(a.player_id);
        }
      }
    }

    for (const p of onFieldOutfield) accTime[p.id] += settings.sub_interval_minutes;
    lineups.push({ period, sub_slot: slot, on_field: assignments, on_bench: onBench, substitutions: [] });
  }

  for (let i = 1; i < lineups.length; i++) {
    lineups[i].substitutions = computeSubstitutions(lineups[i - 1], lineups[i]);
  }

  return lineups;
}
