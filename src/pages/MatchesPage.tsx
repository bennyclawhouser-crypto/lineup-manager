import { useState } from 'react';
import { Plus, ChevronRight, Users, Trash2 } from 'lucide-react';
import type { Match, MatchSettings, Player } from '../types';
import SportadminImport from '../components/SportadminImport';

interface Props {
  matches: Match[];
  players: Player[];
  onCreateMatch: (m: Match) => Promise<void>;
  onSelectMatch: (m: Match) => void;
  onUpsertPlayer?: (p: Player) => Promise<void>;
  onDeleteMatch?: (id: string) => Promise<void>;
}

const DEFAULT_SETTINGS: MatchSettings = {
  periods: 3, period_minutes: 25, sub_interval_minutes: 12.5,
};

export default function MatchesPage({ matches, players, onCreateMatch, onSelectMatch, onUpsertPlayer, onDeleteMatch }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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

  const handleImportConfirm = async ({ matchedIds, unmatchedNames }: { matchedIds: string[]; unmatchedNames: string[] }) => {
    const newIds: string[] = [];
    if (onUpsertPlayer && unmatchedNames.length > 0) {
      for (const fullName of unmatchedNames) {
        const parts = fullName.trim().split(/\s+/);
        const newPlayer: Player = {
          id: crypto.randomUUID(), team_id: 'default',
          first_name: parts[0] ?? fullName,
          last_name_initial: parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + '.' : '',
          full_name: fullName, position_1: 'CM',
          always_goalkeeper: false, extra_time: false, less_time: false,
        };
        await onUpsertPlayer(newPlayer);
        newIds.push(newPlayer.id);
      }
    }
    setSelectedPlayers([...matchedIds, ...newIds]);
    setPendingNewNames([]);
    setStep('settings');
  };

  const create = async () => {
    const match: Match = {
      id: crypto.randomUUID(), team_id: 'default',
      date: new Date().toISOString().slice(0, 10),
      opponent: opponent || undefined, settings, player_ids: selectedPlayers,
      created_at: new Date().toISOString(),
    };
    await onCreateMatch(match);
    setStep('list'); setOpponent(''); setSelectedPlayers([]);
    setPendingNewNames([]); setSettings({ ...DEFAULT_SETTINGS });
  };

  const fmt = (m: Match) => new Date(m.date).toLocaleDateString('sv-SE', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>Matcher</h2>
        <button onClick={() => { setPendingNewNames([]); setSelectedPlayers([]); setStep('import'); }}
          style={primaryBtn}>
          <Plus size={16} color="#1A1A1A" strokeWidth={2.5} />
          Ny match
        </button>
      </div>

      {/* Empty state */}
      {matches.length === 0 && step === 'list' && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 56, height: 56, background: '#F3F4F6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={24} color="#6B7280" />
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#1A1A1A', marginBottom: 6 }}>Inga matcher ännu</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Skapa din första match för att komma igång</p>
          <button onClick={() => { setPendingNewNames([]); setSelectedPlayers([]); setStep('import'); }} style={primaryBtn}>
            <Plus size={16} color="#1A1A1A" />
            Ny match
          </button>
        </div>
      )}

      {/* Match list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...matches].reverse().map(m => (
          <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', position: 'relative' }}>
            <div onClick={() => onSelectMatch(m)} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer', minWidth: 0 }}>
              <div style={{ width: 44, height: 44, background: '#C8E64C', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={20} color="#1A1A1A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.opponent || 'Okänd motståndare'}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {fmt(m)} · {m.player_ids.length} spelare
                </div>
              </div>
              <ChevronRight size={18} color="#D1D5DB" />
            </div>
            {onDeleteMatch && (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(m.id); }}
                style={{ background: '#FEF2F2', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <Trash2 size={15} color="#EF4444" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: '#1A1A1A', marginBottom: 8 }}>Ta bort match?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Matchen och all data (rotation, anteckningar) tas bort permanent.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px', fontWeight: 500, fontSize: 14, cursor: 'pointer', color: '#1A1A1A' }}>Avbryt</button>
              <button onClick={async () => { await onDeleteMatch!(confirmDelete); setConfirmDelete(null); }}
                style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#fff' }}>
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {step === 'import' && (
        <Modal onClose={() => setStep('list')}>
          <SportadminImport existingPlayers={players} onConfirm={handleImportConfirm} onSkip={() => setStep('settings')} onCancel={() => setStep('list')} />
        </Modal>
      )}

      {/* Settings modal */}
      {step === 'settings' && (
        <Modal onClose={() => setStep('list')}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 20 }}>Matchinställningar</h3>

          <Field label="Motståndare">
            <input style={inputStyle} value={opponent} placeholder="IFK Göteborg" onChange={e => setOpponent(e.target.value)} autoFocus />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Spelare på plan"><input style={inputStyle} type="number" value={playersOnField} min={1} max={11} onChange={e => setPlayersOnField(Number(e.target.value))} /></Field>
            <Field label="Antal perioder"><input style={inputStyle} type="number" value={settings.periods} min={1} max={6} onChange={e => setSettings({ ...settings, periods: Number(e.target.value) })} /></Field>
            <Field label="Min/period"><input style={inputStyle} type="number" value={settings.period_minutes} min={5} max={45} onChange={e => setSettings({ ...settings, period_minutes: Number(e.target.value) })} /></Field>
            <Field label="Bytesintervall"><input style={inputStyle} type="number" value={settings.sub_interval_minutes} min={1} max={45} step={0.5} onChange={e => setSettings({ ...settings, sub_interval_minutes: Number(e.target.value) })} /></Field>
          </div>

          {pendingNewNames.length > 0 && (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '10px 14px', marginBottom: 4, fontSize: 13, color: '#15803D' }}>
              {pendingNewNames.length} nya spelare läggs till i truppen automatiskt
            </div>
          )}

          <Field label={`Spelare (${selectedPlayers.length}/${players.length})`}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button style={ghostBtn} onClick={selectAll}>Välj alla</button>
              <button style={ghostBtn} onClick={clearAll}>Rensa</button>
            </div>
            <div style={{ border: '1.5px solid #E5E7EB', borderRadius: 12, maxHeight: 220, overflowY: 'auto' }}>
              {players.length === 0 && <div style={{ padding: 16, color: '#9CA3AF', fontSize: 14 }}>Lägg till spelare i Truppen först</div>}
              {players.map((p, i) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', background: selectedPlayers.includes(p.id) ? '#FAFFF0' : 'transparent' }}>
                  <input type="checkbox" checked={selectedPlayers.includes(p.id)} onChange={() => togglePlayer(p.id)} style={{ accentColor: '#C8E64C', width: 16, height: 16 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{p.first_name} {p.last_name_initial}</span>
                  {p.always_goalkeeper && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, background: '#FEF3C7', padding: '2px 8px', borderRadius: 99 }}>MV</span>}
                </label>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button style={secondaryBtn} onClick={() => setStep('import')}>Tillbaka</button>
            <button style={{ ...primaryBtn, opacity: selectedPlayers.length < playersOnField ? 0.4 : 1 }} onClick={create} disabled={selectedPlayers.length < playersOnField}>
              Skapa match
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0 0 0' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' };
const primaryBtn: React.CSSProperties = { background: '#C8E64C', color: '#1A1A1A', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 150ms ease-out' };
const secondaryBtn: React.CSSProperties = { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', fontWeight: 500, fontSize: 14, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: '#6B7280', border: 'none', padding: '4px 8px', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', color: '#1A1A1A', outline: 'none' };
