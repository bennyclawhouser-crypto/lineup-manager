import type { PlayerAssignment, Player, Substitution } from '../types';
import { FORMATIONS } from '../lib/formations';

// GK = lila, alla utespelare = ljusgrön bakgrundsfärg (#C8E64C)
const POS_COLORS: Record<string, string> = {
  GK: '#6366F1',
  CB: '#C8E64C',
  WB: '#C8E64C',
  CM: '#C8E64C',
  WM: '#C8E64C',
  ST: '#C8E64C',
};

interface Props {
  assignments: PlayerAssignment[];
  benchIds: string[];
  substitutions?: Substitution[];
  players: Player[];
  formation?: string;
  nextAssignments?: PlayerAssignment[];
  onDrop?: (playerId: string, slotIndex: number) => void;
}

function isChangingPosition(id: string, current: PlayerAssignment[], next: PlayerAssignment[]): boolean {
  const c = current.find(a => a.player_id === id);
  const n = next.find(a => a.player_id === id);
  if (!c || !n) return false;
  return c.slot_index !== n.slot_index;
}

export default function PitchView({
  assignments, benchIds, substitutions = [], players, formation = '3-4-1',
  nextAssignments = [], onDrop,
}: Props) {
  const slots = FORMATIONS[formation]?.slots ?? FORMATIONS['3-4-1'].slots;
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const assignmentAtSlot = (idx: number) => assignments.find(a => a.slot_index === idx);
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);
  const isComingOn = (id: string) => substitutions.some(s => s.in_player_id === id);
  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  return (
    <div>
      {/* Pitch — indigo/lila */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '85%',
        background: 'linear-gradient(180deg, #4A7C45 0%, #3A6335 100%)',
        borderRadius: 16,
        overflow: 'visible',
        boxShadow: '0 4px 20px rgba(67,56,202,0.35)',
      }}>
        {/* Pitch markings */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16 }}
          viewBox="0 0 100 85" preserveAspectRatio="none">
          <rect x="3" y="2" width="94" height="81" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" rx="1" />
          <line x1="3" y1="2" x2="97" y2="2" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
          <rect x="22" y="62" width="56" height="21" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="36" y="75" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <circle cx="50" cy="70" r="1.2" fill="rgba(255,255,255,0.7)" />
          <path d="M 35 62 A 15 15 0 0 1 65 62" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
        </svg>

        {/* Players */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;
          const changingPos = player ? isChangingPosition(player.id, assignments, nextAssignments) : false;
          const posColor = assignment ? (POS_COLORS[assignment.position] ?? '#6366F1') : 'rgba(255,255,255,0.1)';
          const topPct = (slot.y * 85) / 100;

          return (
            <div key={idx} style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 60,
            }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('playerId'); if (id && onDrop) onDrop(id, idx); }}
            >
              <div
                draggable={!!player}
                onDragStart={e => player && e.dataTransfer.setData('playerId', player.id)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: player ? posColor : 'rgba(255,255,255,0.08)',
                  border: `2.5px solid ${goingOff ? '#FFEB3B' : 'rgba(255,255,255,0.9)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: player ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  position: 'relative', flexShrink: 0,
                }}
              >
                {goingOff && (
                  <div style={{ position: 'absolute', top: -7, right: -6, background: '#C8E64C', color: '#1A1A1A', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                    ↓
                  </div>
                )}
                {!goingOff && changingPos && (
                  <div style={{ position: 'absolute', top: -7, left: -6, background: '#fff', color: '#1A1A1A', border: '1.5px solid #D1D5DB', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                    →
                  </div>
                )}
              </div>
              {player && (
                <div style={{ marginTop: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '2px 5px', whiteSpace: 'nowrap', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', backdropFilter: 'blur(2px)' }}>
                  {displayName(player)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench */}
      {benchIds.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Avbytare
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {benchIds.map(id => {
              const p = getPlayer(id);
              const comingOn = isComingOn(id);
              if (!p) return null;
              return (
                <div key={id} draggable onDragStart={e => e.dataTransfer.setData('playerId', id)}
                  style={{ background: comingOn ? '#F0FDF4' : '#F9FAFB', border: `1.5px solid ${comingOn ? '#86EFAC' : '#E5E7EB'}`, borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 500, cursor: 'grab', color: comingOn ? '#15803D' : '#1A1A1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {comingOn && <span style={{ fontSize: 11, color: '#15803D', fontWeight: 700 }}>+</span>}
                  {displayName(p)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
