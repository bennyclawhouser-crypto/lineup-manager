import { useState } from 'react';
import type { Match, MatchSettings, Player } from '../types';

interface Props {
  matches: Match[];
  players: Player[];
  onCreateMatch: (m: Match) => void;
  onSelectMatch: (m: Match) => void;
}

const DEFAULT_SETTINGS: MatchSettings = {
  periods: 3,
  period_minutes: 25,
  sub_interval_minutes: 12.5,
};

export default function MatchesPage({ matches, players, onCreateMatch, onSelectMatch }: Props) {
  const [creating, setCreating] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [settings, setSettings] = useState<MatchSettings>({ ...DEFAULT_SETTINGS });
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [playersOnField, setPlayersOnField] = useState(9);

  const togglePlayer = (id: string) =>
    setSelectedPlayers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const create = () => {
    const match: Match = {
      id: crypto.randomUUID(),
      team_id: 'default',
      date: new Date().toISOString().slice(0, 10),
      opponent: opponent || undefined,
      settings,
      player_ids: selectedPlayers,
      created_at: new Date().toISOString(),
    };
    onCreateMatch(match);
    setCreating(false);
    setOpponent('');
    setSelectedPlayers([]);
    setSettings({ ...DEFAULT_SETTINGS });
    onSelectMatch(match);
  };

  const fmt = (m: Match) => {
    const d = new Date(m.date);
    return d.toLocaleDateString('sv-SE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>⚽ Matcher</h2>
        <button onClick={() => setCreating(true)} style={btnStyle('#2563eb')}>+ Ny match</button>
      </div>

      {matches.length === 0 && !creating && (
        <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
          <div style={{ fontSize: 48 }}>⚽</div>
          <p>Inga matcher än. Skapa din första match!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {[...matches].reverse().map(m => (
          <div key={m.id} style={cardStyle} onClick={() => onSelectMatch(m)}>
            <div style={{ fontWeight: 700 }}>{m.opponent || 'Okänd motståndare'}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {fmt(m)} · {m.player_ids.length} spelare · {m.settings.periods}×{m.settings.period_minutes} min
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div style={modalBackdrop} onClick={() => setCreating(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3>Ny match</h3>

            <label style={labelStyle}>Motståndare (valfritt)</label>
            <input style={inputStyle} value={opponent} placeholder="IFK Göteborg"
              onChange={e => setOpponent(e.target.value)} />

            <label style={labelStyle}>Spelare på plan</label>
            <input style={inputStyle} type="number" value={playersOnField} min={1} max={11}
              onChange={e => setPlayersOnField(Number(e.target.value))} />

            <label style={labelStyle}>Antal perioder</label>
            <input style={inputStyle} type="number" value={settings.periods} min={1} max={6}
              onChange={e => setSettings({ ...settings, periods: Number(e.target.value) })} />

            <label style={labelStyle}>Minuter per period</label>
            <input style={inputStyle} type="number" value={settings.period_minutes} min={5} max={45}
              onChange={e => setSettings({ ...settings, period_minutes: Number(e.target.value) })} />

            <label style={labelStyle}>Bytesintervall (minuter)</label>
            <input style={inputStyle} type="number" value={settings.sub_interval_minutes} min={1} max={45} step={0.5}
              onChange={e => setSettings({ ...settings, sub_interval_minutes: Number(e.target.value) })} />

            <label style={labelStyle}>Välj spelare till denna match ({selectedPlayers.length} valda)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 }}>
              {players.map(p => (
                <label key={p.id} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                  {p.first_name} {p.last_name_initial}.
                  {p.always_goalkeeper && <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>MV</span>}
                </label>
              ))}
              {players.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Lägg till spelare i Truppen först.</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={btnStyle('#2563eb')} onClick={create}
                disabled={selectedPlayers.length < playersOnField}>
                Skapa match
              </button>
              <button style={btnStyle('#6b7280')} onClick={() => setCreating(false)}>Avbryt</button>
            </div>
            {selectedPlayers.length < playersOnField &&
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
                Välj minst {playersOnField} spelare.
              </p>}
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '12px 16px', cursor: 'pointer',
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600, opacity: 1,
});
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginTop: 10, marginBottom: 3 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' };
