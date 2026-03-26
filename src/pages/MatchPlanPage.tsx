import { useState, useEffect, useCallback } from 'react';
import type { Match, Player, PeriodLineup } from '../types';
import { generateRotation } from '../lib/rotation';
import PitchView from '../components/PitchView';
import { DEFAULT_FORMATION, FORMATIONS } from '../lib/formations';
import { useMatchPlan } from '../hooks/useMatchPlan';
import MatchComments from '../components/MatchComments';
import { RefreshCw, Users, Clock, ArrowLeftRight, Share2, Check, Settings2 } from 'lucide-react';

function computeSubstitutionsLocal(prev: PeriodLineup, curr: PeriodLineup): PeriodLineup['substitutions'] {
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
  const [maxChangePct, setMaxChangePct] = useState(25);
  const [copied, setCopied] = useState(false);

  const matchUrl = `${window.location.origin}${window.location.pathname}?match=${currentMatch.id}`;

  const handleShare = async () => {
    const shareData = {
      title: `Lineup — ${currentMatch.opponent || 'Match'}`,
      text: `Se laguppställningen för ${currentMatch.opponent || 'matchen'}`,
      url: matchUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(matchUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }; // % of players allowed to change position
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

      // Propagate the manual slot assignment forward:
      // For each subsequent slot where the player is still on field,
      // keep them in the same slot_index (unless they've been subbed out).
      const updated = editedLineups.map((lineup, i) => {
        if (i <= activeIdx) return lineup;
        // Check if player is still on field in this slot
        const playerInSlot = lineup.on_field.find(a => a.player_id === playerId);
        if (!playerInSlot) return lineup; // subbed out — don't touch
        // Move player to same slot as in the edited slot
        const editedAssignment = editedLineups[activeIdx].on_field.find(a => a.player_id === playerId);
        if (!editedAssignment) return lineup;
        const targetSlot = editedAssignment.slot_index;
        const targetPos = editedAssignment.position;
        // If another player occupies target slot, swap them
        const occupant = lineup.on_field.find(a => a.slot_index === targetSlot && a.player_id !== playerId);
        let newField = lineup.on_field.map(a => {
          if (a.player_id === playerId) return { ...a, slot_index: targetSlot, position: targetPos };
          if (occupant && a.player_id === occupant.player_id) return { ...a, slot_index: playerInSlot.slot_index, position: playerInSlot.position };
          return a;
        });
        return { ...lineup, on_field: newField };
      });

      // Recompute substitutions for all transitions from activeIdx onward
      for (let i = Math.max(1, activeIdx); i < updated.length; i++) {
        updated[i] = { ...updated[i], substitutions: computeSubstitutionsLocal(updated[i - 1], updated[i]) };
      }
      if (activeIdx > 0) {
        updated[activeIdx] = { ...updated[activeIdx], substitutions: computeSubstitutionsLocal(updated[activeIdx - 1], updated[activeIdx]) };
      }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {/* Share button */}
        <button onClick={handleShare} style={{ ...primaryBtn, gap: 6 }}>
          {copied ? <Check size={15} color="#1A1A1A" /> : <Share2 size={15} color="#1A1A1A" />}
          {copied ? 'Kopierad!' : 'Dela'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
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

      {/* Formation picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.keys(FORMATIONS).map(f => (
          <button key={f} onClick={() => handleFormationChange(f)} style={{
            padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: formation === f ? '#A8C530' : '#fff',
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
            background: i === activeIdx ? '#A8C530' : '#fff',
            color: '#1A1A1A',
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

      {/* Position change setting */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 16px' }}>
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

      {/* Match settings editor */}
      <MatchSettingsEditor
        match={currentMatch}
        maxChangePct={maxChangePct}
        onMaxChangePctChange={setMaxChangePct}
        onSave={(newSettings, pct) => {
          setCurrentMatch(prev => ({ ...prev, settings: newSettings }));
          const g = generateRotation({ players: matchPlayers, settings: newSettings, playersOnField, formation, maxPositionChangeFraction: pct / 100 });
          setLineups(g); saveLineups(g); setActiveIdx(0);
          import('../lib/supabase').then(({ supabase }) => {
            supabase.from('matches').update({ settings: newSettings }).eq('id', currentMatch.id);
          });
        }}
      />

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

function MatchSettingsEditor({ match, onSave, maxChangePct, onMaxChangePctChange }: {
  match: Match;
  onSave: (s: Match['settings'], pct: number) => void;
  maxChangePct: number;
  onMaxChangePctChange: (v: number) => void;
}) {
  const [s, setS] = useState({ ...match.settings });
  const [saved, setSaved] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const save = () => { onSave(s, maxChangePct); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A1A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings2 size={16} color="#6366F1" />
        Matchinställningar
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {([
          { label: 'Perioder', key: 'periods', min: 1, max: 6, step: 1 },
          { label: 'Min/period', key: 'period_minutes', min: 5, max: 45, step: 5 },
          { label: 'Bytesintervall (min)', key: 'sub_interval_minutes', min: 1, max: 45, step: 0.5 },
        ] as { label: string; key: keyof Match['settings']; min: number; max: number; step: number }[]).map(({ label, key, min, max, step }) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
            <input type="number" value={s[key]} min={min} max={max} step={step}
              onChange={e => setS(prev => ({ ...prev, [key]: Number(e.target.value) }))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', color: '#1A1A1A', outline: 'none' }} />
          </div>
        ))}
      </div>

      {/* Position change slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <ArrowLeftRight size={13} color="#6B7280" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max positionsbyte</span>
          <button onClick={() => setShowInfo(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6B7280' }}>i</div>
          </button>
        </div>
        {showInfo && (
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
            Styr hur många procent av utespelarna som tillåts byta fysisk position på planen under en hel match. Vid 0% stannar alla spelare på sin ursprungliga position och bara avbytare tar den utbytte spelarens plats. Vid 100% kan algoritmen fritt flytta spelare för att optimera positionsmatch.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={maxChangePct}
            onChange={e => onMaxChangePctChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#A8C530' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', minWidth: 36 }}>{maxChangePct}%</span>
        </div>
      </div>

      <button onClick={save} style={{ background: saved ? '#22C55E' : '#C8E64C', color: '#1A1A1A', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'background 200ms ease-out', display: 'flex', alignItems: 'center', gap: 6 }}>
        {saved ? <><Check size={15} color="#fff" /><span style={{ color: '#fff' }}>Sparat!</span></> : 'Spara & generera om'}
      </button>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const primaryBtn: React.CSSProperties = { background: '#C8E64C', color: '#1A1A1A', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const secondaryBtn: React.CSSProperties = { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '7px 14px', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
