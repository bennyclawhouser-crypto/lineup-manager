import type { PlayerAssignment, Player, Substitution } from '../types';
import { FORMATIONS } from '../lib/formations';

const POS_COLORS: Record<string, string> = {
  GK: '#E65100', CB: '#1565C0', WB: '#1976D2',
  CM: '#2E7D32', WM: '#388E3C', ST: '#AD1457',
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

export default function PitchView({
  assignments, benchIds, substitutions = [], players, formation = '3-4-1',
  onDrop,
}: Props) {
  const slots = FORMATIONS[formation]?.slots ?? FORMATIONS['3-4-1'].slots;
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const assignmentAtSlot = (idx: number) => assignments.find(a => a.slot_index === idx);
  // Players marked to be substituted NEXT (shown with highlight ring)
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);
  const isComingOn = (id: string) => substitutions.some(s => s.in_player_id === id);

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  // Half-pitch aspect ratio: roughly 68% of full pitch
  // We use paddingBottom to maintain aspect ratio
  return (
    <div>
      {/* Half-pitch */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '75%',   // half pitch ~75% wide aspect
        background: 'linear-gradient(180deg, #43A047 0%, #388E3C 40%, #2E7D32 100%)',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        {/* Pitch markings - half pitch view */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 100 75" preserveAspectRatio="none">
          {/* Halfway line (top = attack end) */}
          <line x1="3" y1="2" x2="97" y2="2" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
          {/* Side lines */}
          <line x1="3" y1="2" x2="3" y2="73" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
          <line x1="97" y1="2" x2="97" y2="73" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
          {/* Goal line */}
          <line x1="3" y1="73" x2="97" y2="73" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
          {/* Penalty area */}
          <rect x="22" y="52" width="56" height="21" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
          {/* Goal area */}
          <rect x="36" y="65" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
          {/* Goal */}
          <rect x="40" y="72" width="20" height="3" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
          {/* Penalty spot */}
          <circle cx="50" cy="62" r="0.8" fill="rgba(255,255,255,0.5)" />
          {/* Center arc (top) */}
          <path d="M 28 2 A 22 22 0 0 0 72 2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        </svg>

        {/* Players */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;
          const posColor = assignment ? (POS_COLORS[assignment.position] ?? '#455A64') : 'rgba(255,255,255,0.15)';

          return (
            <div key={idx}
              style={{
                position: 'absolute',
                left: `${slot.x}%`,
                top: `${slot.y * 75 / 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('playerId');
                if (id && onDrop) onDrop(id, idx);
              }}
            >
              {/* Outer ring for "going off" indicator */}
              {goingOff && (
                <div style={{
                  position: 'absolute', inset: -4,
                  borderRadius: '50%',
                  border: '2.5px solid #FFEB3B',
                  animation: 'pulse 1.5s infinite',
                  zIndex: 0,
                }} />
              )}
              <div
                draggable={!!player}
                onDragStart={e => player && e.dataTransfer.setData('playerId', player.id)}
                style={{
                  position: 'relative',
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: player ? posColor : 'rgba(255,255,255,0.12)',
                  border: `2px solid ${goingOff ? '#FFEB3B' : 'rgba(255,255,255,0.85)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: player ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
                  zIndex: 1,
                }}
              />
              {player && (
                <div style={{
                  position: 'absolute', top: 38, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.72)', color: '#fff',
                  borderRadius: 3, fontSize: 10, fontWeight: 600,
                  padding: '2px 5px', whiteSpace: 'nowrap',
                  zIndex: 2,
                }}>
                  {displayName(player)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench */}
      {benchIds.length > 0 && (
        <div style={{ marginTop: 14, padding: '0 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Avbytare
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {benchIds.map(id => {
              const p = getPlayer(id);
              const comingOn = isComingOn(id);
              if (!p) return null;
              return (
                <div key={id} draggable
                  onDragStart={e => e.dataTransfer.setData('playerId', id)}
                  style={{
                    background: comingOn ? '#E8F5E9' : '#F1F3F4',
                    border: `1.5px solid ${comingOn ? '#43A047' : '#DADCE0'}`,
                    borderRadius: 20, padding: '5px 12px',
                    fontSize: 13, fontWeight: 500, cursor: 'grab',
                    color: comingOn ? '#2E7D32' : '#202124',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {comingOn && <span style={{ fontSize: 12, color: '#43A047' }}>↑</span>}
                  {displayName(p)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
