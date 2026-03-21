import { useState } from 'react';
import type { Match, MatchSettings, Player } from '../types';
import SportadminImport from '../components/SportadminImport';

interface Props {
  matches: Match[];
  players: Player[];
  onCreateMatch: (m: Match) => Promise<void>;
  onSelectMatch: (m: Match) => void;
  loading?: boolean;
}

const DEFAULT_SETTINGS: MatchSettings = {
  periods: 3,
  period_minutes: 25,
  sub_interval_minutes: 12.5,
};

export default function MatchesPage({ matches, players, onCreateMatch, onSelectMatch }: Props) {
  const [step, setStep] = useState<'list' | 'import' | 'settings'>('list');
  const [opponent, setOpponent] = useState('');
  const [settings, setSettings] = useState<MatchSettings>({ ...DEFAULT_SETTINGS });
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playersOnField, setPlayersOnField] = useState(9);
  const [pendingNewNames, setPendingNewNames] = useState<string[]>([]);


  const togglePlayer = (id: string) =>
    setSelectedPlayers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const selectAll = () => setSelectedPlayers(players.map(p => p.id));
  const clearAll = () => setSelectedPlayers([]);

  const handleImportConfirm = ({ matchedIds, unmatchedNames }: { matchedIds: string[]; unmatchedNames: string[] }) => {
    setSelectedPlayers(matchedIds);
    setPendingNewNames(unmatchedNames);
    setStep('settings');
  };

  const create = async () => {
    const match: Match = {
      id: crypto.randomUUID(),
      team_id: 'default',
      date: new Date().toISOString().slice(0, 10),
      opponent: opponent || undefined,
      settings,
      player_ids: selectedPlayers,
      created_at: new Date().toISOString(),
    };
    await onCreateMatch(match);
    setStep('list');

    setOpponent('');
    setSelectedPlayers([]);
    setPendingNewNames([]);
    setSettings({ ...DEFAULT_SETTINGS });
    onSelectMatch(match);
  };

  const fmt = (m: Match) => {
    const d = new Date(m.date);
    return d.toLocaleDateString('sv-SE', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#202124' }}>Matcher</h2>
        <button onClick={() => { setPendingNewNames([]); setSelectedPlayers([]); setStep('import'); }} style={fabBtn}>
          <span style={{ fontSize: 20, marginRight: 6 }}>+</span> Ny match
        </button>
      </div>

      {matches.length === 0 && step === 'list' && (
        <div style={emptyState}>
          <div style={{ fontSize: 56 }}>⚽</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#202124', marginTop: 16 }}>Inga matcher ännu</div>
          <div style={{ fontSize: 14, color: '#5f6368', marginTop: 8 }}>Skapa din första match för att komma igång.</div>
          <button onClick={() => { setPendingNewNames([]); setSelectedPlayers([]); setStep('import'); }} style={{ ...fabBtn, marginTop: 24 }}>+ Ny match</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[...matches].reverse().map(m => (
          <div key={m.id} style={listItem} onClick={() => onSelectMatch(m)}>
            <div style={{ ...avatar, background: '#1a73e8' }}>⚽</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: '#202124', fontSize: 15 }}>
                {m.opponent || 'Okänd motståndare'}
              </div>
              <div style={{ fontSize: 13, color: '#5f6368', marginTop: 2 }}>
                {fmt(m)} · {m.player_ids.length} spelare · {m.settings.periods}×{m.settings.period_minutes} min
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#bdc1c6">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Step: Sportadmin import */}
      {step === 'import' && (
        <div style={modalBackdrop} onClick={() => setStep('list')}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <SportadminImport
              existingPlayers={players}
              onConfirm={handleImportConfirm}
              onSkip={() => setStep('settings')}
            />
          </div>
        </div>
      )}

      {/* Step: Match settings */}
      {step === 'settings' && (
        <div style={modalBackdrop} onClick={() => setStep('list')}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 500, fontSize: 18, color: '#202124' }}>Matchinställningar</h3>

            <Field label="Motståndare (valfritt)">
              <input style={input} value={opponent} placeholder="IFK Göteborg"
                onChange={e => setOpponent(e.target.value)} autoFocus />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Spelare på plan">
                <input style={input} type="number" value={playersOnField} min={1} max={11}
                  onChange={e => setPlayersOnField(Number(e.target.value))} />
              </Field>
              <Field label="Antal perioder">
                <input style={input} type="number" value={settings.periods} min={1} max={6}
                  onChange={e => setSettings({ ...settings, periods: Number(e.target.value) })} />
              </Field>
              <Field label="Min per period">
                <input style={input} type="number" value={settings.period_minutes} min={5} max={45}
                  onChange={e => setSettings({ ...settings, period_minutes: Number(e.target.value) })} />
              </Field>
              <Field label="Bytesintervall (min)">
                <input style={input} type="number" value={settings.sub_interval_minutes} min={1} max={45} step={0.5}
                  onChange={e => setSettings({ ...settings, sub_interval_minutes: Number(e.target.value) })} />
              </Field>
            </div>

            {pendingNewNames.length > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: '#c2410c', marginBottom: 6 }}>
                  {pendingNewNames.length} spelare hittades men saknas i truppen
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#7c2d12', fontSize: 13 }}>
                  {pendingNewNames.map(name => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <div style={{ fontSize: 12, color: '#7c2d12', marginTop: 6 }}>
                  Lägg till dem under fliken “Truppen” för att kunna välja dem här.
                </div>
                <button
                  style={{ marginTop: 8, border: '1px solid #f97316', background: '#fff', color: '#c2410c', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigator.clipboard?.writeText(pendingNewNames.join('\n')).catch(() => {})}
                >
                  Kopiera lista
                </button>
              </div>
            )}

            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={fieldLabel}>Spelare ({selectedPlayers.length}/{players.length} valda)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={linkBtn} onClick={selectAll}>Välj alla</button>
                  <button style={linkBtn} onClick={clearAll}>Rensa</button>
                </div>
              </div>
              <div style={{ border: '1px solid #dadce0', borderRadius: 4, maxHeight: 200, overflowY: 'auto' }}>
                {players.length === 0 && (
                  <div style={{ padding: 16, color: '#5f6368', fontSize: 14 }}>Lägg till spelare i Truppen först.</div>
                )}
                {players.map((p, i) => (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    cursor: 'pointer', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none',
                    background: selectedPlayers.includes(p.id) ? '#e8f0fe' : 'transparent',
                  }}>
                    <input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                    <span style={{ flex: 1, fontSize: 14, color: '#202124' }}>
                      {p.first_name} {p.last_name_initial}
                    </span>
                    {p.always_goalkeeper && <span style={{ fontSize: 12, color: '#F9A825', fontWeight: 600 }}>MV</span>}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button style={textBtn('#5f6368')} onClick={() => setStep('import')}>← Tillbaka</button>
              <button style={{ ...containedBtn, opacity: selectedPlayers.length < playersOnField ? 0.5 : 1 }}
                onClick={create} disabled={selectedPlayers.length < playersOnField}>
                Skapa match
              </button>
            </div>
            {selectedPlayers.length < playersOnField && (
              <p style={{ fontSize: 12, color: '#E53935', margin: '8px 0 0', textAlign: 'right' }}>
                Välj minst {playersOnField} spelare.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500, color: '#5f6368',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px',
};
const fabBtn: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 24,
  padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
  display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
const listItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
  background: '#fff',
};
const avatar: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0,
};
const emptyState: React.CSSProperties = {
  textAlign: 'center', padding: '60px 20px',
};
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 4,
  border: '1px solid #dadce0', fontSize: 14, boxSizing: 'border-box',
  outline: 'none', color: '#202124',
};
const containedBtn: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 22px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
const textBtn = (color: string): React.CSSProperties => ({
  background: 'none', color, border: 'none', borderRadius: 4,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
});
const linkBtn: React.CSSProperties = {
  background: 'none', color: '#1a73e8', border: 'none',
  cursor: 'pointer', fontWeight: 500, fontSize: 13, padding: '2px 4px',
};
const modalBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};
const modalBox: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: 24,
  width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 24px 38px rgba(0,0,0,0.14)',
};
