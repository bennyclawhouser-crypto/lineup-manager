import { useState } from 'react';
import type { Player, Position, Foot } from '../types';

const POSITIONS: { value: Position; label: string; color: string }[] = [
  { value: 'GK',  label: 'Målvakt',           color: '#F9A825' },
  { value: 'CB',  label: 'Innerback',          color: '#1565C0' },
  { value: 'WB',  label: 'Ytterback',          color: '#1976D2' },
  { value: 'CM',  label: 'Innermittfältare',   color: '#2E7D32' },
  { value: 'WM',  label: 'Yttermittfältare',   color: '#388E3C' },
  { value: 'ST',  label: 'Anfallare',          color: '#C62828' },
];

const posLabel = (v: Position) => POSITIONS.find(p => p.value === v)?.label ?? v;
const posColor = (v: Position) => POSITIONS.find(p => p.value === v)?.color ?? '#757575';

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
    const last_name_initial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + '.' : '';
    const updated = { ...form, first_name, last_name_initial } as Player;
    const exists = players.find(p => p.id === updated.id);
    onUpdate(exists ? players.map(p => p.id === updated.id ? updated : p) : [...players, updated]);
    setEditing(null);
  };

  const remove = (id: string) => { onUpdate(players.filter(p => p.id !== id)); setEditing(null); };

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#202124' }}>Truppen</h2>
        <button onClick={startNew} style={fabBtn}>
          <span style={{ fontSize: 20, marginRight: 6 }}>+</span> Ny spelare
        </button>
      </div>

      {players.length === 0 && (
        <div style={emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👟</div>
          <div style={{ color: '#5f6368', fontSize: 15 }}>Inga spelare ännu.<br />Lägg till spelarna i truppen.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {players.map(p => (
          <div key={p.id} style={listItem} onClick={() => startEdit(p)}>
            <div style={{ ...avatar, background: posColor(p.position_1) }}>
              {p.first_name[0]}{p.last_name_initial[0] ?? ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: '#202124', fontSize: 15 }}>{displayName(p)}</div>
              <div style={{ fontSize: 13, color: '#5f6368', marginTop: 2 }}>
                {posLabel(p.position_1)}
                {p.position_2 && <span> · {posLabel(p.position_2)}</span>}
                {p.position_3 && <span> · {posLabel(p.position_3)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {p.always_goalkeeper && <Chip label="MV" color="#F9A825" />}
              {p.extra_time && <Chip label="+tid" color="#1E88E5" />}
              {p.less_time && <Chip label="−tid" color="#E53935" />}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={modalBackdrop} onClick={() => setEditing(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 500, fontSize: 18, color: '#202124' }}>
              {players.find(p => p.id === editing.id) ? 'Redigera spelare' : 'Ny spelare'}
            </h3>

            <Field label="Fullständigt namn">
              <input style={input} value={form.full_name || ''} placeholder="Ludvig Treffner"
                onChange={e => setForm({ ...form, full_name: e.target.value })} autoFocus />
            </Field>

            <Field label="Dominant fot">
              <select style={input} value={form.dominant_foot || ''}
                onChange={e => setForm({ ...form, dominant_foot: e.target.value as Foot || undefined })}>
                <option value="">Ej angiven</option>
                <option value="left">Vänster</option>
                <option value="right">Höger</option>
                <option value="both">Båda</option>
              </select>
            </Field>

            <Field label="Position 1 — primär">
              <select style={input} value={form.position_1 || 'CM'}
                onChange={e => {
                  const val = e.target.value as Position;
                  setForm({ ...form, position_1: val, always_goalkeeper: val === 'GK' });
                }}>
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <Field label="Position 2 — valfri">
              <select style={input} value={form.position_2 || ''}
                onChange={e => setForm({ ...form, position_2: e.target.value as Position || undefined })}>
                <option value="">—</option>
                {POSITIONS.filter(p => p.value !== form.position_1).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <Field label="Position 3 — valfri">
              <select style={input} value={form.position_3 || ''}
                onChange={e => setForm({ ...form, position_3: e.target.value as Position || undefined })}>
                <option value="">—</option>
                {POSITIONS.filter(p => p.value !== form.position_1 && p.value !== form.position_2).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              <label style={checkLabel}>
                <input type="checkbox" checked={!!form.extra_time}
                  onChange={e => setForm({ ...form, extra_time: e.target.checked })} />
                <span>Mer speltid</span>
              </label>
              <label style={checkLabel}>
                <input type="checkbox" checked={!!form.less_time}
                  onChange={e => setForm({ ...form, less_time: e.target.checked })} />
                <span>Mindre speltid</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              {players.find(p => p.id === editing?.id) && (
                <button style={textBtn('#E53935')} onClick={() => remove(editing!.id)}>Ta bort</button>
              )}
              <button style={textBtn('#5f6368')} onClick={() => setEditing(null)}>Avbryt</button>
              <button style={containedBtn} onClick={save}
                disabled={!form.full_name || !form.position_1}>Spara</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#5f6368', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + '1A', color, border: `1px solid ${color}40`, borderRadius: 12, fontSize: 11, fontWeight: 600, padding: '2px 7px' }}>
      {label}
    </span>
  );
}

const fabBtn: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 24,
  padding: '8px 20px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
  display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
const listItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
  transition: 'background 0.15s',
  background: '#fff',
};
const avatar: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
};
const emptyState: React.CSSProperties = {
  textAlign: 'center', padding: '60px 20px', color: '#5f6368',
};
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 4,
  border: '1px solid #dadce0', fontSize: 14, boxSizing: 'border-box',
  outline: 'none', color: '#202124', background: '#fff',
};
const checkLabel: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#202124', cursor: 'pointer',
};
const containedBtn: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 22px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
};
const textBtn = (color: string): React.CSSProperties => ({
  background: 'none', color, border: 'none', borderRadius: 4,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 500, fontSize: 14,
});
const modalBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
};
const modalBox: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: 24,
  width: '90%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 24px 38px rgba(0,0,0,0.14)',
};
