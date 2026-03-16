import { useState, useEffect } from 'react';
import type { Match, Player, PeriodLineup } from '../types';
import { generateRotation } from '../lib/rotation';
import PitchView from '../components/PitchView';
import { DEFAULT_FORMATION } from '../lib/formations';

interface Props {
  match: Match;
  players: Player[];
  onBack: () => void;
}

export default function MatchPlanPage({ match, players, onBack }: Props) {
  const matchPlayers = players.filter(p => match.player_ids.includes(p.id));
  const [lineups, setLineups] = useState<PeriodLineup[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [formation] = useState(DEFAULT_FORMATION);

  useEffect(() => {
    const generated = generateRotation({
      players: matchPlayers,
      settings: match.settings,
      playersOnField: 9, // TODO: store on match
      formation,
    });
    setLineups(generated);
  }, [match.id]);

  const handleDrop = (playerId: string, slotIndex: number) => {
    setLineups(prev => prev.map((lineup, i) => {
      if (i !== activeIdx) return lineup;
      const existing = lineup.on_field.find(a => a.slot_index === slotIndex);
      let newField = lineup.on_field.filter(a => a.slot_index !== slotIndex && a.player_id !== playerId);
      const position = lineup.on_field.find(a => a.slot_index === slotIndex)?.position
        || lineup.on_field.find(a => a.player_id === playerId)?.position
        || 'CM';

      if (existing) {
        // Swap
        const fromAssign = lineup.on_field.find(a => a.player_id === playerId);
        if (fromAssign) {
          newField = newField.filter(a => a.player_id !== playerId);
          newField.push({ player_id: existing.player_id, position: fromAssign.position, slot_index: fromAssign.slot_index });
        } else {
          // Coming from bench
          const newBench = lineup.on_bench.filter(id => id !== playerId);
          newBench.push(existing.player_id);
          newField.push({ player_id: playerId, position, slot_index: slotIndex });
          return { ...lineup, on_field: newField, on_bench: newBench };
        }
      }

      newField.push({ player_id: playerId, position, slot_index: slotIndex });
      const newBench = lineup.on_bench.filter(id => id !== playerId);
      return { ...lineup, on_field: newField, on_bench: newBench };
    }));
  };

  if (lineups.length === 0) return <div style={{ padding: 20 }}>Genererar uppställning...</div>;

  const current = lineups[activeIdx];
  const next = lineups[activeIdx + 1];
  const isLastSlot = activeIdx === lineups.length - 1;

  const periodLabel = (l: PeriodLineup) =>
    `Period ${l.period}${l.sub_slot > 0 ? ` · Byte ${l.sub_slot}` : ''}`;

  // Play time stats
  const timeStats: Record<string, number> = {};
  for (const p of matchPlayers) timeStats[p.id] = 0;
  for (const l of lineups) {
    for (const a of l.on_field) {
      timeStats[a.player_id] = (timeStats[a.player_id] || 0) + match.settings.sub_interval_minutes;
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={btnStyle('#6b7280')}>← Tillbaka</button>
        <h2 style={{ margin: 0 }}>{match.opponent || 'Match'}</h2>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {lineups.map((l, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            style={{
              padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: i === activeIdx ? '#2563eb' : '#f3f4f6',
              color: i === activeIdx ? '#fff' : '#374151',
            }}>
            {periodLabel(l)}
          </button>
        ))}
      </div>

      {/* Current lineup */}
      <PitchView
        assignments={current.on_field}
        benchIds={current.on_bench}
        substitutions={!isLastSlot ? next?.substitutions : []}
        players={matchPlayers}
        formation={formation}
        showSubArrows={!isLastSlot}
        nextAssignments={next?.on_field}
        onDrop={handleDrop}
      />

      {/* Next sub info */}
      {!isLastSlot && next?.substitutions.length > 0 && (
        <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🔄 Nästa byte ({periodLabel(next)})</div>
          {next.substitutions.map((s, i) => {
            const out = matchPlayers.find(p => p.id === s.out_player_id);
            const inn = matchPlayers.find(p => p.id === s.in_player_id);
            return (
              <div key={i} style={{ fontSize: 14, marginBottom: 3 }}>
                <span style={{ color: '#ef4444' }}>↓ {out?.first_name} {out?.last_name_initial}.</span>
                {' → '}
                <span style={{ color: '#16a34a' }}>↑ {inn?.first_name} {inn?.last_name_initial}.</span>
                {' '}({s.to_position})
              </div>
            );
          })}
        </div>
      )}

      {/* Play time stats */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>⏱ Speltid</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {matchPlayers.map(p => {
            const time = timeStats[p.id] || 0;
            const total = match.settings.periods * match.settings.period_minutes;
            const pct = Math.round((time / total) * 100);
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, fontSize: 13, fontWeight: 600 }}>
                  {p.first_name} {p.last_name_initial}.
                </div>
                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                  <div style={{ width: `${pct}%`, background: '#2563eb', borderRadius: 4, height: '100%' }} />
                </div>
                <div style={{ width: 50, fontSize: 12, color: '#666', textAlign: 'right' }}>{time} min</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 14px', cursor: 'pointer', fontWeight: 600,
});
