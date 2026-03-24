import { useState, useEffect, useCallback } from 'react';
import type { Match, Player, PeriodLineup } from '../types';
import { generateRotation } from '../lib/rotation';
import PitchView from '../components/PitchView';
import { DEFAULT_FORMATION, FORMATIONS } from '../lib/formations';
import { useMatchPlan } from '../hooks/useMatchPlan';

interface Props {
  match: Match;
  players: Player[];
  onBack: () => void;
}

export default function MatchPlanPage({ match, players }: Props) {
  const matchPlayers = players.filter(p => match.player_ids.includes(p.id));
  const { lineups: savedLineups, saveLineups, syncing } = useMatchPlan(match.id);
  const [lineups, setLineups] = useState<PeriodLineup[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [initialized, setInitialized] = useState(false);
  const playersOnField = 9;

  // Load saved plan from Supabase
  useEffect(() => {
    if (savedLineups.length > 0 && !initialized) {
      setLineups(savedLineups);
      setInitialized(true);
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
    });
    setLineups(generated);
    saveLineups(generated);
    setActiveIdx(0);
  }, [matchPlayers, match.settings]);

  const handleDrop = useCallback((playerId: string, slotIndex: number) => {
    setLineups(prev => {
      const updated = prev.map((lineup, i) => {
        if (i !== activeIdx) return lineup;
        const existingAtSlot = lineup.on_field.find(a => a.slot_index === slotIndex);
        const movingPlayer = lineup.on_field.find(a => a.player_id === playerId);
        let newField = [...lineup.on_field];
        let newBench = [...lineup.on_bench];

        if (movingPlayer && existingAtSlot) {
          // Swap on-field players
          newField = newField.map(a => {
            if (a.player_id === playerId) return { ...a, slot_index: slotIndex, position: existingAtSlot.position };
            if (a.slot_index === slotIndex) return { ...a, slot_index: movingPlayer.slot_index, position: movingPlayer.position };
            return a;
          });
        } else if (movingPlayer) {
          newField = newField.map(a => a.player_id === playerId ? { ...a, slot_index: slotIndex } : a);
        } else {
          // From bench to field
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
      // Persist after state update
      saveLineups(updated);
      return updated;
    });
  }, [activeIdx, formation, saveLineups]);

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
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto', paddingBottom: 32 }}>

      {/* Syncing indicator */}
      {syncing && (
        <div style={{ fontSize: 12, color: '#1a73e8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🔄</span> Synkar med molnet...
        </div>
      )}

      {/* Formation picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(FORMATIONS).map(f => (
          <button key={f} onClick={() => handleFormationChange(f)} style={{
            padding: '4px 12px', borderRadius: 16,
            border: `1.5px solid ${formation === f ? '#1a73e8' : '#dadce0'}`,
            background: formation === f ? '#e8f0fe' : '#fff',
            color: formation === f ? '#1a73e8' : '#5f6368',
            cursor: 'pointer', fontWeight: 500, fontSize: 13,
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Slot tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {lineups.map((l, i) => (
          <button key={i} onClick={() => setActiveIdx(i)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 16,
            border: `1px solid ${i === activeIdx ? '#1a73e8' : '#dadce0'}`,
            background: i === activeIdx ? '#1a73e8' : '#fff',
            color: i === activeIdx ? '#fff' : '#202124',
            fontWeight: i === activeIdx ? 600 : 400, fontSize: 13,
            cursor: 'pointer',
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

      {/* Next sub info */}
      {!isLast && next?.substitutions?.length > 0 && (
        <div style={{ marginTop: 14, background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontWeight: 500, color: '#F57F17', marginBottom: 8, fontSize: 14 }}>
            🔄 Nästa byte ({slotLabel(next)})
          </div>
          {next.substitutions.map((s, i) => {
            const out = matchPlayers.find(p => p.id === s.out_player_id);
            const inn = matchPlayers.find(p => p.id === s.in_player_id);
            if (!out || !inn) return null;
            return (
              <div key={i} style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: '#E53935', fontWeight: 500 }}>↓ {out.first_name} {out.last_name_initial}</span>
                <span style={{ color: '#9E9E9E' }}>→</span>
                <span style={{ color: '#43A047', fontWeight: 500 }}>↑ {inn.first_name} {inn.last_name_initial}</span>
                <span style={{ color: '#9E9E9E', fontSize: 12 }}>({s.to_position})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Play time stats */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: 16 }}>
        <div style={{ fontWeight: 500, color: '#202124', marginBottom: 12, fontSize: 15 }}>⏱ Speltid</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedByTime.map(p => {
            const time = timeStats[p.id] || 0;
            const pct = Math.min(100, Math.round((time / totalTime) * 100));
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 76, fontSize: 13, fontWeight: 500, color: '#202124', flexShrink: 0 }}>
                  {p.first_name} {p.last_name_initial}
                </div>
                <div style={{ flex: 1, background: '#f1f3f4', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 4,
                    background: pct >= 75 ? '#43A047' : pct >= 45 ? '#1a73e8' : '#FB8C00',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ width: 48, fontSize: 12, color: '#5f6368', textAlign: 'right', flexShrink: 0 }}>
                  {time} min
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
