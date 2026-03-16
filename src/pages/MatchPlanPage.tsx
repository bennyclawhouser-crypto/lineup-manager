import { useState, useEffect } from 'react';
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

  // When saved lineups load from Supabase, use them
  useEffect(() => {
    if (savedLineups.length > 0 && !initialized) {
      setLineups(savedLineups);
      setInitialized(true);
    }
  }, [savedLineups]);

  // If no saved plan, generate one
  useEffect(() => {
    if (matchPlayers.length === 0) return;
    if (initialized) return;
    const generated = generateRotation({ players: matchPlayers, settings: match.settings, playersOnField, formation });
    setLineups(generated);
    saveLineups(generated);
    setInitialized(true);
    setActiveIdx(0);
  }, [match.id, formation, initialized]);

  const handleDrop = (playerId: string, slotIndex: number) => {
    setLineups(prev => prev.map((lineup, i) => {
      if (i !== activeIdx) return lineup;
      const existingAtSlot = lineup.on_field.find(a => a.slot_index === slotIndex);
      const movingPlayer = lineup.on_field.find(a => a.player_id === playerId);

      let newField = [...lineup.on_field];
      let newBench = [...lineup.on_bench];

      if (movingPlayer && existingAtSlot) {
        // Swap two on-field players
        newField = newField.map(a => {
          if (a.player_id === playerId) return { ...a, slot_index: slotIndex, position: existingAtSlot.position };
          if (a.slot_index === slotIndex) return { ...a, slot_index: movingPlayer.slot_index, position: movingPlayer.position };
          return a;
        });
      } else if (movingPlayer) {
        // Move to empty slot
        newField = newField.map(a => a.player_id === playerId ? { ...a, slot_index: slotIndex } : a);
      } else {
        // Coming from bench
        newBench = newBench.filter(id => id !== playerId);
        const pos = existingAtSlot?.position ?? (FORMATIONS[formation]?.slots[slotIndex]?.position as typeof newField[0]['position'] ?? 'CM');
        if (existingAtSlot) {
          newField = newField.filter(a => a.slot_index !== slotIndex);
          newBench.push(existingAtSlot.player_id);
        }
        newField.push({ player_id: playerId, position: pos, slot_index: slotIndex });
      }
      return { ...lineup, on_field: newField, on_bench: newBench };
    }));
    saveLineups(lineups); // persist after state update
  };

  if (lineups.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#5f6368' }}>
      Genererar uppställning...
    </div>
  );

  const current = lineups[activeIdx];
  const next = lineups[activeIdx + 1];
  const isLast = activeIdx === lineups.length - 1;

  // Play time stats
  const totalTime = match.settings.periods * match.settings.period_minutes;
  const timeStats: Record<string, number> = Object.fromEntries(matchPlayers.map(p => [p.id, 0]));
  for (const l of lineups) {
    for (const a of l.on_field) timeStats[a.player_id] = (timeStats[a.player_id] || 0) + match.settings.sub_interval_minutes;
  }
  const sortedByTime = [...matchPlayers].sort((a, b) => (timeStats[b.id] || 0) - (timeStats[a.id] || 0));

  const slotLabel = (l: PeriodLineup) =>
    l.sub_slot === 0 ? `P${l.period} start` : `P${l.period} byte ${l.sub_slot}`;

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>

      {/* Formation picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.keys(FORMATIONS).map(f => (
          <button key={f} onClick={() => setFormation(f)} style={{
            padding: '4px 12px', borderRadius: 16, border: '1.5px solid',
            borderColor: formation === f ? '#1a73e8' : '#dadce0',
            background: formation === f ? '#e8f0fe' : '#fff',
            color: formation === f ? '#1a73e8' : '#5f6368',
            cursor: 'pointer', fontWeight: 500, fontSize: 13,
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Period/slot tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {lineups.map((l, i) => {
          const isNewPeriod = i === 0 || lineups[i - 1].period !== l.period;
          return (
            <button key={i} onClick={() => setActiveIdx(i)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: i === activeIdx ? '#1a73e8' : isNewPeriod ? '#f1f3f4' : '#fff',
              color: i === activeIdx ? '#fff' : '#202124',
              fontWeight: i === activeIdx ? 600 : 400, fontSize: 13,
              } as React.CSSProperties}>
              {slotLabel(l)}
            </button>
          );
        })}
      </div>

      {/* Pitch */}
      <PitchView
        assignments={current.on_field}
        benchIds={current.on_bench}
        substitutions={!isLast ? next?.substitutions : []}
        players={matchPlayers}
        formation={formation}
        showSubArrows={!isLast}
        nextAssignments={next?.on_field}
        onDrop={handleDrop}
      />

      {/* Next sub card */}
      {!isLast && next?.substitutions.length > 0 && (
        <div style={{
          marginTop: 16, background: '#FFF8E1', border: '1px solid #FFE082',
          borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{ fontWeight: 500, color: '#F57F17', marginBottom: 8, fontSize: 14 }}>
            🔄 Kommande byte — {slotLabel(next)}
          </div>
          {next.substitutions.map((s, i) => {
            const out = matchPlayers.find(p => p.id === s.out_player_id);
            const inn = matchPlayers.find(p => p.id === s.in_player_id);
            return (
              <div key={i} style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: '#E53935', fontWeight: 500 }}>↓ {out?.first_name} {out?.last_name_initial}</span>
                <span style={{ color: '#9E9E9E' }}>→</span>
                <span style={{ color: '#43A047', fontWeight: 500 }}>↑ {inn?.first_name} {inn?.last_name_initial}</span>
                <span style={{ color: '#9E9E9E', fontSize: 12 }}>({s.to_position})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Play time */}
      <div style={{ marginTop: 20, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '16px' }}>
        <div style={{ fontWeight: 500, color: '#202124', marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⏱ Speltid
          {syncing && <span style={{ fontSize: 12, color: '#1a73e8' }}>↑ sparar...</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedByTime.map(p => {
            const time = timeStats[p.id] || 0;
            const pct = Math.min(100, Math.round((time / totalTime) * 100));
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 72, fontSize: 13, fontWeight: 500, color: '#202124', flexShrink: 0 }}>
                  {p.first_name} {p.last_name_initial}
                </div>
                <div style={{ flex: 1, background: '#f1f3f4', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 4,
                    background: pct >= 80 ? '#43A047' : pct >= 50 ? '#1a73e8' : '#FB8C00',
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
