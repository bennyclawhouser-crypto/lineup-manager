import type { PlayerAssignment, Player, Substitution } from '../types';
import { FORMATIONS } from '../lib/formations';

const POS_COLORS: Record<string, string> = {
  GK: '#E65100', CB: '#1565C0', WB: '#1976D2',
  CM: '#2E7D32', WM: '#388E3C', ST: '#B71C1C',
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
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  // Half-pitch aspect ratio: ~68% of full pitch height
  return (
    <div>
      {/* Half-pitch */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '72%', // half pitch ratio
        background: 'linear-gradient(180deg, #388E3C 0%, #2E7D32 100%)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        {/* Pitch markings */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 100 72" preserveAspectRatio="none">
          {/* Outer border */}
          <rect x="3" y="2" width="94" height="68" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          {/* Midfield line at top */}
          <line x1="3" y1="2" x2="97" y2="2" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          {/* Penalty area */}
          <rect x="22" y="50" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          {/* Goal area */}
          <rect x="36" y="62" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          {/* Penalty spot */}
          <circle cx="50" cy="58" r="0.8" fill="rgba(255,255,255,0.4)" />
          {/* Penalty arc */}
          <path d="M 35 50 A 15 15 0 0 1 65 50" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        </svg>

        {/* Players on field */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;
          const posColor = assignment ? (POS_COLORS[assignment.position] ?? '#455A64') : 'rgba(255,255,255,0.15)';

          return (
            <div key={idx} style={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
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
              <div
                draggable={!!player}
                onDragStart={e => player && e.dataTransfer.setData('playerId', player.id)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: player ? posColor : 'rgba(255,255,255,0.1)',
                  border: `2.5px solid ${goingOff ? '#FFEB3B' : 'rgba(255,255,255,0.85)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: player ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
                  position: 'relative',
                }}
              >
                {goingOff && (
                  <div style={{
                    position: 'absolute', top: -7, right: -7,
                    background: '#FFEB3B', color: '#333',
                    borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}>↓</div>
                )}
              </div>
              {player && (
                <div style={{
                  position: 'absolute', top: 38, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.72)', color: '#fff', borderRadius: 3,
                  fontSize: 10, fontWeight: 600, padding: '2px 5px', whiteSpace: 'nowrap',
                  pointerEvents: 'none',
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
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Avbytare
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {benchIds.map(id => {
              const p = getPlayer(id);
              const comingOn = substitutions.some(s => s.in_player_id === id);
              if (!p) return null;
              return (
                <div key={id} draggable
                  onDragStart={e => e.dataTransfer.setData('playerId', id)}
                  style={{
                    background: comingOn ? '#E8F5E9' : '#F1F3F4',
                    border: `1.5px solid ${comingOn ? '#43A047' : '#DADCE0'}`,
                    borderRadius: 20, padding: '4px 11px',
                    fontSize: 13, fontWeight: 500, cursor: 'grab',
                    color: comingOn ? '#2E7D32' : '#202124',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {comingOn && <span style={{ fontSize: 11 }}>↑</span>}
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
