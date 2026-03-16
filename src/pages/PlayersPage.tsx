import { useState } from 'react';
import type { Player, Position, Foot } from '../types';

const POSITIONS: Position[] = ['GK','CB','LB','RB','DM','CM','LM','RM','AM','LW','RW','ST'];

const POSITION_LABELS: Record<Position, string> = {
  GK: 'Målvakt', CB: 'Mittback', LB: 'Vänsterback', RB: 'Högerback',
  DM: 'Defensiv MF', CM: 'Innermittfältare', LM: 'Vänster MF', RM: 'Höger MF',
  AM: 'Offensiv MF', LW: 'Vänsterytter', RW: 'Högerytter', ST: 'Anfallare',
};

interface Props {
  players: Player[];
  onUpdate: (players: Player[]) => void;
}

export default function PlayersPage({ players, onUpdate }: Props) {
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState<Partial<Player>>({});

  const startEdit = (p: Player) => { setEditing(p); setForm({ ...p }); };
  const startNew = () => {
    const blank: Partial<Player> = {
      id: crypto.randomUUID(), team_id: 'default',
      always_goalkeeper: false, position_1: 'CM',
    };
    setEditing(blank as Player);
    setForm(blank);
  };

  const save = () => {
    if (!form.full_name || !form.position_1) return;
    const parts = (form.full_name || '').trim().split(' ');
    const first_name = parts[0];
    const last_name_initial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
    const updated = { ...form, first_name, last_name_initial } as Player;
    const exists = players.find(p => p.id === updated.id);
    onUpdate(exists ? players.map(p => p.id === updated.id ? updated : p) : [...players, updated]);
    setEditing(null);
  };

  const remove = (id: string) => onUpdate(players.filter(p => p.id !== id));

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}.`;

  return (
    <div style={{ padding: '1rem', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>👥 Truppen</h2>
        <button onClick={startNew} style={btnStyle('#2563eb')}>+ Ny spelare</button>
      </div>

      {players.length === 0 && <p style={{ color: '#888' }}>Inga spelare ännu.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {players.map(p => (
          <div key={p.id} style={cardStyle} onClick={() => startEdit(p)}>
            <div>
              <strong>{displayName(p)}</strong>
              {p.always_goalkeeper && <span style={badgeStyle('#f59e0b')}>MV</span>}
              {p.extra_time && <span style={badgeStyle('#10b981')}>+tid</span>}
              {p.less_time && <span style={badgeStyle('#ef4444')}>−tid</span>}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {POSITION_LABELS[p.position_1]}
              {p.position_2 && ` · ${POSITION_LABELS[p.position_2]}`}
              {p.position_3 && ` · ${POSITION_LABELS[p.position_3]}`}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={modalBackdrop} onClick={() => setEditing(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3>{form.full_name ? 'Redigera spelare' : 'Ny spelare'}</h3>

            <label style={labelStyle}>Fullständigt namn</label>
            <input style={inputStyle} value={form.full_name || ''} placeholder="Ludvig Treffner"
              onChange={e => setForm({ ...form, full_name: e.target.value })} />

            <label style={labelStyle}>Dominant fot</label>
            <select style={inputStyle} value={form.dominant_foot || ''}
              onChange={e => setForm({ ...form, dominant_foot: e.target.value as Foot || undefined })}>
              <option value="">Ej angiven</option>
              <option value="left">Vänster</option>
              <option value="right">Höger</option>
              <option value="both">Båda</option>
            </select>

            <label style={labelStyle}>Position 1 (obligatorisk)</label>
            <select style={inputStyle} value={form.position_1 || 'CM'}
              onChange={e => setForm({ ...form, position_1: e.target.value as Position, always_goalkeeper: e.target.value === 'GK' })}>
              {POSITIONS.map(pos => <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>)}
            </select>

            <label style={labelStyle}>Position 2 (valfri)</label>
            <select style={inputStyle} value={form.position_2 || ''}
              onChange={e => setForm({ ...form, position_2: e.target.value as Position || undefined })}>
              <option value="">—</option>
              {POSITIONS.filter(p => p !== form.position_1).map(pos => <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>)}
            </select>

            <label style={labelStyle}>Position 3 (valfri)</label>
            <select style={inputStyle} value={form.position_3 || ''}
              onChange={e => setForm({ ...form, position_3: e.target.value as Position || undefined })}>
              <option value="">—</option>
              {POSITIONS.filter(p => p !== form.position_1 && p !== form.position_2).map(pos => <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <label><input type="checkbox" checked={!!form.extra_time}
                onChange={e => setForm({ ...form, extra_time: e.target.checked })} /> Mer speltid</label>
              <label><input type="checkbox" checked={!!form.less_time}
                onChange={e => setForm({ ...form, less_time: e.target.checked })} /> Mindre speltid</label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={btnStyle('#2563eb')} onClick={save}>Spara</button>
              <button style={btnStyle('#6b7280')} onClick={() => setEditing(null)}>Avbryt</button>
              {players.find(p => p.id === editing?.id) &&
                <button style={btnStyle('#ef4444')} onClick={() => { remove(editing!.id); setEditing(null); }}>Ta bort</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
  padding: '10px 14px', cursor: 'pointer',
};
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600,
});
const badgeStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', borderRadius: 4, fontSize: 11,
  padding: '1px 6px', marginLeft: 6, fontWeight: 700,
});
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginTop: 10, marginBottom: 3 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' };
const modalBackdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 };
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' };
