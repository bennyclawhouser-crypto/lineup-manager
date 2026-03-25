import { useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import type { Player, Position, Foot } from '../types';

const POSITIONS: { value: Position; label: string; color: string }[] = [
  { value: 'GK', label: 'Målvakt',         color: '#F59E0B' },
  { value: 'CB', label: 'Innerback',        color: '#6366F1' },
  { value: 'WB', label: 'Ytterback',        color: '#8B5CF6' },
  { value: 'CM', label: 'Innermittfältare', color: '#22C55E' },
  { value: 'WM', label: 'Yttermittfältare', color: '#10B981' },
  { value: 'ST', label: 'Anfallare',        color: '#EF4444' },
];

const posLabel = (v: Position) => POSITIONS.find(p => p.value === v)?.label ?? v;
const posColor = (v: Position) => POSITIONS.find(p => p.value === v)?.color ?? '#9CA3AF';

interface Props {
  players: Player[];
  onUpsert: (player: Player) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PlayersPage({ players, onUpsert, onDelete }: Props) {
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState<Partial<Player>>({});

  const startEdit = (p: Player) => {
    const approx = `${p.first_name} ${p.last_name_initial.replace('.', '')}`.trim();
    setEditing(p); setForm({ ...p, full_name: approx });
  };
  const startNew = () => {
    const blank: Partial<Player> = { id: crypto.randomUUID(), team_id: 'default', always_goalkeeper: false, position_1: 'CM', full_name: '' };
    setEditing(blank as Player); setForm(blank);
  };

  const save = async () => {
    if (!form.full_name || !form.position_1) return;
    const parts = (form.full_name || '').trim().split(' ');
    const updated = { ...form, first_name: parts[0], last_name_initial: parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() + '.' : '' } as Player;
    await onUpsert(updated); setEditing(null);
  };

  const remove = async (id: string) => { await onDelete(id); setEditing(null); };
  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;
  const avatarInitials = (p: Player) => `${p.first_name[0] ?? ''}${p.last_name_initial[0] ?? ''}`;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>Truppen</h2>
        <button onClick={startNew} style={primaryBtn}>
          <Plus size={16} color="#1A1A1A" strokeWidth={2.5} />
          Ny spelare
        </button>
      </div>

      {players.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 56, height: 56, background: '#F3F4F6', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Plus size={24} color="#6B7280" />
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, color: '#1A1A1A', marginBottom: 6 }}>Inga spelare ännu</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Lägg till spelarna i din trupp</p>
          <button onClick={startNew} style={primaryBtn}><Plus size={16} color="#1A1A1A" />Lägg till spelare</button>
        </div>
      )}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {players.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', transition: 'background 150ms ease-out' }}
            onClick={() => startEdit(p)}>
            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: posColor(p.position_1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {avatarInitials(p)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A1A' }}>{displayName(p)}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>
                {posLabel(p.position_1)}
                {p.position_2 && ` · ${posLabel(p.position_2)}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {p.always_goalkeeper && <Tag label="MV" color="#F59E0B" />}
              {p.extra_time && <Tag label="+tid" color="#6366F1" />}
              {p.less_time && <Tag label="-tid" color="#EF4444" />}
              <MoreHorizontal size={18} color="#D1D5DB" />
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setEditing(null)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 20 }}>
              {players.find(p => p.id === editing.id) ? 'Redigera spelare' : 'Ny spelare'}
            </h3>

            <Field label="Fullständigt namn">
              <input style={inputStyle} value={form.full_name || ''} placeholder="Ludvig Treffner" onChange={e => setForm({ ...form, full_name: e.target.value })} autoFocus />
            </Field>

            <Field label="Dominant fot">
              <select style={inputStyle} value={form.dominant_foot || ''} onChange={e => setForm({ ...form, dominant_foot: e.target.value as Foot || undefined })}>
                <option value="">Ej angiven</option>
                <option value="left">Vänster</option>
                <option value="right">Höger</option>
                <option value="both">Båda</option>
              </select>
            </Field>

            <Field label="Position 1 — primär">
              <select style={inputStyle} value={form.position_1 || 'CM'} onChange={e => { const v = e.target.value as Position; setForm({ ...form, position_1: v, always_goalkeeper: v === 'GK' }); }}>
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <Field label="Position 2 — valfri">
              <select style={inputStyle} value={form.position_2 || ''} onChange={e => setForm({ ...form, position_2: e.target.value as Position || undefined })}>
                <option value="">—</option>
                {POSITIONS.filter(p => p.value !== form.position_1).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <Field label="Position 3 — valfri">
              <select style={inputStyle} value={form.position_3 || ''} onChange={e => setForm({ ...form, position_3: e.target.value as Position || undefined })}>
                <option value="">—</option>
                {POSITIONS.filter(p => p.value !== form.position_1 && p.value !== form.position_2).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <label style={checkLabel}><input type="checkbox" checked={!!form.extra_time} onChange={e => setForm({ ...form, extra_time: e.target.checked })} style={{ accentColor: '#C8E64C' }} /><span>Mer speltid</span></label>
              <label style={checkLabel}><input type="checkbox" checked={!!form.less_time} onChange={e => setForm({ ...form, less_time: e.target.checked })} style={{ accentColor: '#C8E64C' }} /><span>Mindre speltid</span></label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {players.find(p => p.id === editing?.id) && (
                <button style={{ ...ghostBtn, color: '#EF4444' }} onClick={() => remove(editing!.id)}>Ta bort spelare</button>
              )}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button style={secondaryBtn} onClick={() => setEditing(null)}>Avbryt</button>
                <button style={{ ...primaryBtn, opacity: !form.full_name ? 0.4 : 1 }} onClick={save} disabled={!form.full_name}>Spara</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return <span style={{ background: color + '18', color, borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '3px 8px' }}>{label}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' };
const primaryBtn: React.CSSProperties = { background: '#C8E64C', color: '#1A1A1A', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const secondaryBtn: React.CSSProperties = { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 16px', fontWeight: 500, fontSize: 14, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: '#6B7280', border: 'none', padding: '8px 4px', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, boxSizing: 'border-box', color: '#1A1A1A', outline: 'none' };
const checkLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#1A1A1A', cursor: 'pointer' };
