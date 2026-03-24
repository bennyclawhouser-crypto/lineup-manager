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
  assignments, benchIds, substitutions = [], players, formation = '3-4-1', onDrop,
}: Props) {
  const slots = FORMATIONS[formation]?.slots ?? FORMATIONS['3-4-1'].slots;
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const assignmentAtSlot = (idx: number) => assignments.find(a => a.slot_index === idx);
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);
  const isComingOn = (id: string) => substitutions.some(s => s.in_player_id === id);
  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  return (
    <div>
      {/* Half-pitch — fixed aspect ratio so labels always fit */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '85%',
        background: 'linear-gradient(180deg, #2E7D32 0%, #388E3C 60%, #2E7D32 100%)',
        borderRadius: 10,
        overflow: 'visible', // allow labels to extend slightly outside
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        {/* Pitch markings */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 10 }}
          viewBox="0 0 100 85" preserveAspectRatio="none">
          <rect x="3" y="2" width="94" height="81" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          <line x1="3" y1="2" x2="97" y2="2" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
          <rect x="22" y="62" width="56" height="21" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
          <rect x="36" y="75" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.4)" />
          <path d="M 35 62 A 15 15 0 0 1 65 62" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />
        </svg>

        {/* Players */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;
          const posColor = assignment ? (POS_COLORS[assignment.position] ?? '#455A64') : 'rgba(255,255,255,0.12)';

          // Convert slot.y (0-100) to percentage of padded height
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
              width: 56,
            }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('playerId');
                if (id && onDrop) onDrop(id, idx);
              }}
            >
              {/* Circle */}
              <div
                draggable={!!player}
                onDragStart={e => player && e.dataTransfer.setData('playerId', player.id)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: player ? posColor : 'rgba(255,255,255,0.1)',
                  border: `2.5px solid ${goingOff ? '#FFEB3B' : 'rgba(255,255,255,0.85)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: player ? '0 2px 6px rgba(0,0,0,0.5)' : 'none',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {goingOff && (
                  <div style={{
                    position: 'absolute', top: -8, right: -6,
                    background: '#FFEB3B', color: '#333',
                    borderRadius: '50%', width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>↓</div>
                )}
              </div>
              {/* Name label — always visible below circle */}
              {player && (
                <div style={{
                  marginTop: 3,
                  background: 'rgba(0,0,0,0.72)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 5px',
                  whiteSpace: 'nowrap',
                  maxWidth: 70,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  lineHeight: 1.3,
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
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5f6368', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
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
                  }}>
                  {comingOn && <span style={{ fontSize: 12 }}>↑</span>}
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
