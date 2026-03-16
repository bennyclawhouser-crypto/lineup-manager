import type { PlayerAssignment, Player, Substitution } from '../types';
import { FORMATIONS } from '../lib/formations';

const POS_COLORS: Record<string, string> = {
  GK: '#F9A825', CB: '#1565C0', WB: '#1976D2',
  CM: '#2E7D32', WM: '#388E3C', ST: '#C62828',
};

interface Props {
  assignments: PlayerAssignment[];
  benchIds: string[];
  substitutions?: Substitution[];
  players: Player[];
  formation?: string;
  showSubArrows?: boolean;
  nextAssignments?: PlayerAssignment[];
  onDrop?: (playerId: string, slotIndex: number) => void;
}

export default function PitchView({
  assignments, benchIds, substitutions = [], players, formation = '3-2-3',
  showSubArrows = false, nextAssignments = [], onDrop,
}: Props) {
  const slots = FORMATIONS[formation]?.slots ?? FORMATIONS['3-2-3'].slots;
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const assignmentAtSlot = (idx: number) => assignments.find(a => a.slot_index === idx);
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);
  const isComingOn = (id: string) => substitutions.some(s => s.in_player_id === id);

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}`;

  return (
    <div>
      {/* Pitch */}
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '140%',
        background: 'linear-gradient(180deg, #2E7D32 0%, #388E3C 50%, #2E7D32 100%)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        {/* Pitch markings */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 100 140" preserveAspectRatio="none">
          {/* Outer border */}
          <rect x="4" y="4" width="92" height="132" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
          {/* Halfway line */}
          <line x1="4" y1="70" x2="96" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          {/* Center circle */}
          <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.4)" />
          {/* Top penalty area */}
          <rect x="22" y="4" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          <rect x="34" y="4" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          {/* Bottom penalty area */}
          <rect x="22" y="118" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          <rect x="34" y="128" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
        </svg>

        {/* Substitution arrows */}
        {showSubArrows && substitutions.map((sub, i) => {
          const fromA = assignments.find(a => a.player_id === sub.out_player_id);
          const toA = nextAssignments.find(a => a.player_id === sub.in_player_id);
          if (!fromA || !toA) return null;
          const from = slots[fromA.slot_index];
          const to = slots[toA.slot_index];
          if (!from || !to) return null;
          return (
            <svg key={i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              viewBox="0 0 100 140" preserveAspectRatio="none">
              <defs>
                <marker id={`arr${i}`} markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
                  <path d="M0,0 L0,5 L5,2.5 z" fill="rgba(255,235,59,0.9)" />
                </marker>
              </defs>
              <line
                x1={from.x} y1={from.y * 1.4}
                x2={to.x} y2={to.y * 1.4}
                stroke="rgba(255,235,59,0.9)" strokeWidth="1.2" strokeDasharray="2.5,2"
                markerEnd={`url(#arr${i})`}
              />
            </svg>
          );
        })}

        {/* Players */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;
          const posColor = assignment ? (POS_COLORS[assignment.position] ?? '#455A64') : 'rgba(255,255,255,0.15)';

          return (
            <div key={idx} style={{
              position: 'absolute',
              left: `${slot.x}%`, top: `${slot.y * 140 / 100}%`,
              transform: 'translate(-50%, -50%)', zIndex: 10,
            }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('playerId'); if (id && onDrop) onDrop(id, idx); }}
            >
              <div
                draggable={!!player}
                onDragStart={e => player && e.dataTransfer.setData('playerId', player.id)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: player ? posColor : 'rgba(255,255,255,0.12)',
                  border: `2.5px solid ${goingOff ? '#FFEB3B' : 'rgba(255,255,255,0.8)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: player ? '0 2px 6px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.15s',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}
              >
                {goingOff && (
                  <span style={{ position: 'absolute', top: -8, right: -6, fontSize: 12, background: '#FFEB3B', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</span>
                )}
              </div>
              {player && (
                <div style={{
                  position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.75)', color: '#fff', borderRadius: 3,
                  fontSize: 10, fontWeight: 600, padding: '2px 5px', whiteSpace: 'nowrap',
                  backdropFilter: 'blur(2px)',
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
