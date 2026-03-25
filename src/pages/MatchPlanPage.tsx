import { useState, useEffect, useCallback } from 'react';
import type { Match, Player, PeriodLineup } from '../types';
import { generateRotation } from '../lib/rotation';
import PitchView from '../components/PitchView';
import { DEFAULT_FORMATION, FORMATIONS } from '../lib/formations';
import { useMatchPlan } from '../hooks/useMatchPlan';
import MatchComments from '../components/MatchComments';
import { RefreshCw, Users, Clock, ArrowLeftRight } from 'lucide-react';

/**
 * After a manual edit to slot `editedIdx`, regenerate all subsequent slots
 * so the rest of the rotation is based on the new arrangement.
 */
function regenerateFromSlot(
  editedLineups: PeriodLineup[],
  editedIdx: number,
  allPlayers: Player[],
  settings: Match['settings'],
  playersOnField: number,
  formation: string
): PeriodLineup[] {
  if (editedIdx >= editedLineups.length - 1) return editedLineups;

  // Calculate accumulated time for each player up to and including editedIdx
  const interval = settings.sub_interval_minutes;
  const accTime: Record<string, number> = {};
  for (const p of allPlayers) accTime[p.id] = 0;
  for (let i = 0; i <= editedIdx; i++) {
    for (const a of editedLineups[i].on_field) {
      accTime[a.player_id] = (accTime[a.player_id] ?? 0) + interval;
    }
  }

  const gk = allPlayers.find(p => p.always_goalkeeper);
  const outfield = allPlayers.filter(p => !p.always_goalkeeper);
  const spotsNeeded = playersOnField - (gk ? 1 : 0);
  const weights: Record<string, number> = {};
  for (const p of outfield) weights[p.id] = p.extra_time ? 1.5 : p.less_time ? 0.5 : 1;

  const formationDef = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION];

  // Import position assignment helper via generateRotation trick:
  // We'll regenerate ALL slots and splice in the edited ones.
  const futureSlots = editedLineups.slice(editedIdx + 1);
  const newFuture: PeriodLineup[] = [];
  const shuffled = [...outfield].sort(() => Math.random() - 0.5);

  for (const slot of futureSlots) {
    const sorted = [...shuffled].sort((a, b) =>
      (accTime[a.id] / weights[a.id]) - (accTime[b.id] / weights[b.id])
    );
    const onFieldOutfield = sorted.slice(0, spotsNeeded);
    const onBench = sorted.slice(spotsNeeded).map(p => p.id);

    // Assign positions using preference score
    const assignments = assignByPreference(onFieldOutfield, formationDef, gk);

    for (const p of onFieldOutfield) accTime[p.id] = (accTime[p.id] ?? 0) + interval;

    newFuture.push({ ...slot, on_field: assignments, on_bench: onBench, substitutions: [] });
  }

  // Compute substitutions
  const result = [...editedLineups.slice(0, editedIdx + 1), ...newFuture];
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const curr = result[i];
    const prevIds = new Set(prev.on_field.map(a => a.player_id));
    const currIds = new Set(curr.on_field.map(a => a.player_id));
    const goingOff = prev.on_field.filter(a => !currIds.has(a.player_id));
    const comingOn = curr.on_field.filter(a => !prevIds.has(a.player_id));
    result[i].substitutions = goingOff.flatMap((out, idx) => {
      const inn = comingOn[idx];
      if (!inn) return [];
      return [{ out_player_id: out.player_id, in_player_id: inn.player_id, from_position: out.position, to_position: inn.position }];
    });
  }
  return result;
}

function assignByPreference(
  outfield: Player[],
  formation: { slots: { position: string; x: number; y: number }[] },
  gk?: Player
): import('../types').PlayerAssignment[] {
  const assignments: import('../types').PlayerAssignment[] = [];
  if (gk) {
    const gkSlot = formation.slots.findIndex(s => s.position === 'GK');
    if (gkSlot >= 0) assignments.push({ player_id: gk.id, position: 'GK', slot_index: gkSlot });
  }
  const outfieldSlots = formation.slots
    .map((s, i) => ({ ...s, idx: i }))
    .filter(s => s.position !== 'GK');

  const pairs: { score: number; pidx: number; sidx: number }[] = [];
  for (let pi = 0; pi < outfield.length; pi++) {
    for (let si = 0; si < outfieldSlots.length; si++) {
      const p = outfield[pi];
      const pos = outfieldSlots[si].position;
      const score = p.position_1 === pos ? 3 : p.position_2 === pos ? 2 : p.position_3 === pos ? 1 : 0;
      pairs.push({ score, pidx: pi, sidx: si });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const usedP = new Set<number>(), usedS = new Set<number>();
  for (const { pidx, sidx } of pairs) {
    if (usedP.has(pidx) || usedS.has(sidx)) continue;
    const slot = outfieldSlots[sidx];
    assignments.push({ player_id: outfield[pidx].id, position: slot.position as import('../types').Position, slot_index: slot.idx });
    usedP.add(pidx); usedS.add(sidx);
    if (usedP.size === Math.min(outfield.length, outfieldSlots.length)) break;
  }
  return assignments;
}

interface Props {
  match: Match;
  players: Player[];
  onBack: () => void;
  onUpdateMatchPlayers?: (matchId: string, playerIds: string[]) => Promise<void>;
}

export default function MatchPlanPage({ match, players, onUpdateMatchPlayers }: Props) {
  const [currentMatch, setCurrentMatch] = useState(match);
  const [userEmail, setUserEmail] = useState('');
  const matchPlayers = players.filter(p => currentMatch.player_ids.includes(p.id));

  useEffect(() => {
    import('../lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''));
    });
  }, []);
  const { lineups: savedLineups, saveLineups, syncing } = useMatchPlan(currentMatch.id);
  const [lineups, setLineups] = useState<PeriodLineup[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [initialized, setInitialized] = useState(false);
  const [editingRoster, setEditingRoster] = useState(false);
  const [rosterSelection, setRosterSelection] = useState<string[]>(currentMatch.player_ids);
  const [maxChangePct, setMaxChangePct] = useState(25); // % of players allowed to change position
  const playersOnField = 9;

  // Load saved plan from Supabase — validate before using
  useEffect(() => {
    if (savedLineups.length > 0 && !initialized) {
      // Check if saved plan is valid: every slot should have the correct number of on-field players
      const expectedOnField = playersOnField;
      const isValid = savedLineups.every(l => l.on_field.length >= expectedOnField - 1);
      if (isValid) {
        setLineups(savedLineups);
        setInitialized(true);
      }
      // If invalid, fall through to regenerate
    }
  }, [savedLineups, initialized]);

  // Generate new plan if nothing saved
  useEffect(() => {
    if (initialized || matchPlayers.length === 0) return;
    // Only generate after Supabase fetch has completed (savedLineups empty = no saved plan)
    const timer = setTimeout(() => {
      if (initialized) return;
      const generated = generateRotation({
        players: matchPlayers,
        settings: match.settings,
        playersOnField,
        formation,
      
      maxPositionChangeFraction: maxChangePct / 100,
    });
      setLineups(generated);
      saveLineups(generated);
      setInitialized(true);
    }, 600); // wait for Supabase fetch
    return () => clearTimeout(timer);
  }, [match.id, initialized]);

  // Regenerate when formation changes (only after initialized)
  const handleFormationChange = useCallback((f: string) => {
    setFormation(f);
    const generated = generateRotation({
      players: matchPlayers,
      settings: match.settings,
      playersOnField,
      formation: f,
    
      maxPositionChangeFraction: maxChangePct / 100,
    });
    setLineups(generated);
    saveLineups(generated);
    setActiveIdx(0);
  }, [matchPlayers, match.settings]);

  const handleDrop = useCallback((playerId: string, slotIndex: number) => {
    setLineups(prev => {
      // 1. Apply the manual edit to the current slot
      const editedLineups = prev.map((lineup, i) => {
        if (i !== activeIdx) return lineup;
        const existingAtSlot = lineup.on_field.find(a => a.slot_index === slotIndex);
        const movingPlayer = lineup.on_field.find(a => a.player_id === playerId);
        let newField = [...lineup.on_field];
        let newBench = [...lineup.on_bench];

        if (movingPlayer && existingAtSlot) {
          newField = newField.map(a => {
            if (a.player_id === playerId) return { ...a, slot_index: slotIndex, position: existingAtSlot.position };
            if (a.slot_index === slotIndex) return { ...a, slot_index: movingPlayer.slot_index, position: movingPlayer.position };
            return a;
          });
        } else if (movingPlayer) {
          newField = newField.map(a => a.player_id === playerId ? { ...a, slot_index: slotIndex } : a);
        } else {
          newBench = newBench.filter(id => id !== playerId);
          const pos = existingAtSlot?.position
            ?? (FORMATIONS[formation]?.slots[slotIndex]?.position as typeof newField[0]['position'] ?? 'CM');
          if (existingAtSlot) {
            newField = newField.filter(a => a.slot_index !== slotIndex);
            newBench.push(existingAtSlot.player_id);
          }
          newField.push({ player_id: playerId, position: pos, slot_index: slotIndex });
        }
        return { ...lineup, on_field: newField, on_bench: newBench };
      });

      // 2. Regenerate all subsequent slots based on the new arrangement
      const updated = regenerateFromSlot(
        editedLineups, activeIdx, matchPlayers,
        currentMatch.settings, playersOnField, formation
      );

      saveLineups(updated);
      return updated;
    });
  }, [activeIdx, formation, saveLineups, matchPlayers, currentMatch.settings]);

  const saveRoster = async () => {
    if (!onUpdateMatchPlayers) return;
    await onUpdateMatchPlayers(currentMatch.id, rosterSelection);
    setCurrentMatch(prev => ({ ...prev, player_ids: rosterSelection }));
    // Regenerate rotation with new roster
    const newPlayers = players.filter(p => rosterSelection.includes(p.id));
    const generated = generateRotation({ players: newPlayers, settings: currentMatch.settings, playersOnField, formation ,
      maxPositionChangeFraction: maxChangePct / 100,
    });
    setLineups(generated);
    saveLineups(generated);
    setEditingRoster(false);
  };

  if (lineups.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, color: '#5f6368' }}>
      <div style={{ fontSize: 32 }}>⚽</div>
      <div>Genererar uppställning...</div>
    </div>
  );

  const current = lineups[activeIdx];
  const next = lineups[activeIdx + 1];
  const isLast = activeIdx === lineups.length - 1;

  const totalTime = match.settings.periods * match.settings.period_minutes;
  const timeStats: Record<string, number> = Object.fromEntries(matchPlayers.map(p => [p.id, 0]));
  for (const l of lineups) {
    for (const a of l.on_field) {
      timeStats[a.player_id] = (timeStats[a.player_id] || 0) + match.settings.sub_interval_minutes;
    }
  }
  const sortedByTime = [...matchPlayers].sort((a, b) => (timeStats[b.id] || 0) - (timeStats[a.id] || 0));

  const slotLabel = (l: PeriodLineup) =>
    l.sub_slot === 0 ? `P${l.period}` : `P${l.period}.${l.sub_slot}`;

  return (
    <div style={{ paddingTop: 8, paddingBottom: 32 }}>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
        <button onClick={() => {
          const g = generateRotation({ players: matchPlayers, settings: currentMatch.settings, playersOnField, formation, maxPositionChangeFraction: maxChangePct / 100 });
          setLineups(g); saveLineups(g); setActiveIdx(0);
        }} style={secondaryBtn}>
          <RefreshCw size={14} color="#6B7280" />
          Återställ
        </button>
        {onUpdateMatchPlayers && (
          <button onClick={() => { setRosterSelection(currentMatch.player_ids); setEditingRoster(true); }} style={secondaryBtn}>
            <Users size={14} color="#6B7280" />
            Spelare ({matchPlayers.length})
          </button>
        )}
      </div>

      {/* Roster modal */}
      {editingRoster && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setEditingRoster(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: '#1A1A1A', marginBottom: 16 }}>Spelare till matchen</h3>
            <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
              {players.map((p, i) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', background: rosterSelection.includes(p.id) ? '#FAFFF0' : 'transparent' }}>
                  <input type="checkbox" checked={rosterSelection.includes(p.id)} onChange={() => setRosterSelection(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} style={{ accentColor: '#C8E64C', width: 16, height: 16 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{p.first_name} {p.last_name_initial}</span>
                  {p.always_goalkeeper && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, background: '#FEF3C7', padding: '2px 8px', borderRadius: 99 }}>MV</span>}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditingRoster(false)} style={secondaryBtn}>Avbryt</button>
              <button onClick={saveRoster} disabled={rosterSelection.length < playersOnField} style={{ ...primaryBtn, opacity: rosterSelection.length < playersOnField ? 0.4 : 1 }}>
                Spara & generera om
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Syncing */}
      {syncing && (
        <div style={{ fontSize: 12, color: '#6366F1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={12} color="#6366F1" /> Synkar...
        </div>
      )}

      {/* Position change setting */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '12px 16px' }}>
        <ArrowLeftRight size={15} color="#6B7280" />
        <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>Max positionsbyte:</span>
        <input type="range" min={0} max={100} step={5} value={maxChangePct} onChange={e => setMaxChangePct(Number(e.target.value))} style={{ flex: 1, accentColor: '#C8E64C' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', minWidth: 32 }}>{maxChangePct}%</span>
        <button onClick={() => {
          const g = generateRotation({ players: matchPlayers, settings: currentMatch.settings, playersOnField, formation, maxPositionChangeFraction: maxChangePct / 100 });
          setLineups(g); saveLineups(g); setActiveIdx(0);
        }} style={primaryBtn}>
          Ok
        </button>
      </div>

      {/* Formation picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(FORMATIONS).map(f => (
          <button key={f} onClick={() => handleFormationChange(f)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: formation === f ? '#C8E64C' : '#fff',
            color: '#1A1A1A',
            boxShadow: formation === f ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Slot tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {lineups.map((l, i) => (
          <button key={i} onClick={() => setActiveIdx(i)} style={{
            flexShrink: 0, padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: i === activeIdx ? '#6366F1' : '#fff',
            color: i === activeIdx ? '#fff' : '#1A1A1A',
            boxShadow: i === activeIdx ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            {slotLabel(l)}
          </button>
        ))}
      </div>

      {/* Pitch */}
      <PitchView
        assignments={current.on_field}
        benchIds={current.on_bench}
        substitutions={!isLast ? next?.substitutions : []}
        players={matchPlayers}
        formation={formation}
        nextAssignments={next?.on_field}
        onDrop={handleDrop}
      />

      {/* Next sub */}
      {!isLast && next?.substitutions?.length > 0 && (
        <div style={{ ...card, marginTop: 14, padding: '14px 16px', borderLeft: '3px solid #C8E64C' }}>
          <div style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} color="#6B7280" /> Nästa byte — {slotLabel(next)}
          </div>
          {next.substitutions.map((s, i) => {
            const out = matchPlayers.find(p => p.id === s.out_player_id);
            const inn = matchPlayers.find(p => p.id === s.in_player_id);
            if (!out || !inn) return null;
            return (
              <div key={i} style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: '#EF4444', fontWeight: 600 }}>↓ {out.first_name} {out.last_name_initial}</span>
                <span style={{ color: '#D1D5DB' }}>→</span>
                <span style={{ color: '#22C55E', fontWeight: 600 }}>↑ {inn.first_name} {inn.last_name_initial}</span>
                <span style={{ color: '#9CA3AF', fontSize: 12 }}>({s.to_position})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Comments */}
      {userEmail && <MatchComments matchId={currentMatch.id} userEmail={userEmail} />}

      {/* Play time — circular arcs */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: 16, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="#6366F1" />
          Speltid
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-start' }}>
          {sortedByTime.map(p => {
            const time = timeStats[p.id] || 0;
            const pct = Math.min(100, Math.round((time / totalTime) * 100));
            const r = 22, stroke = 6;
            const circ = 2 * Math.PI * r;
            const dash = (pct / 100) * circ;
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56 }}>
                <div style={{ position: 'relative', width: 56, height: 56 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
                    <circle cx="28" cy="28" r={r} fill="none" stroke="#6366F1" strokeWidth={stroke}
                      strokeDasharray={`${dash} ${circ}`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                      style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1A1A1A' }}>
                    {pct}%
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', textAlign: 'center', lineHeight: 1.2, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.first_name}
                </div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>{time}m</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const primaryBtn: React.CSSProperties = { background: '#C8E64C', color: '#1A1A1A', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const secondaryBtn: React.CSSProperties = { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '7px 14px', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
