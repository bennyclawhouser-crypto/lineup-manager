// import React from 'react';
import type { PlayerAssignment, Player, Substitution } from '../types';
import { FORMATIONS } from '../lib/formations';

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

const PITCH_COLOR = '#2d8a4e';
const LINE_COLOR = 'rgba(255,255,255,0.35)';

export default function PitchView({
  assignments, benchIds, substitutions = [], players, formation = '3-2-3',
  showSubArrows = false, nextAssignments = [], onDrop
}: Props) {
  const slots = FORMATIONS[formation]?.slots || FORMATIONS['3-2-3'].slots;

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const assignmentAtSlot = (idx: number) => assignments.find(a => a.slot_index === idx);
  const isGoingOff = (id: string) => substitutions.some(s => s.out_player_id === id);

  const displayName = (p: Player) => `${p.first_name} ${p.last_name_initial}.`;

  return (
    <div style={{ width: '100%' }}>
      {/* Pitch */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '140%', background: PITCH_COLOR, borderRadius: 10, overflow: 'hidden' }}>
        {/* Pitch markings */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 140" preserveAspectRatio="none">
          <rect x="5" y="5" width="90" height="130" fill="none" stroke={LINE_COLOR} strokeWidth="0.8" />
          <line x1="5" y1="70" x2="95" y2="70" stroke={LINE_COLOR} strokeWidth="0.5" />
          <circle cx="50" cy="70" r="10" fill="none" stroke={LINE_COLOR} strokeWidth="0.5" />
          {/* Goal areas */}
          <rect x="30" y="5" width="40" height="10" fill="none" stroke={LINE_COLOR} strokeWidth="0.5" />
          <rect x="30" y="125" width="40" height="10" fill="none" stroke={LINE_COLOR} strokeWidth="0.5" />
          {/* Penalty areas */}
          <rect x="18" y="5" width="64" height="22" fill="none" stroke={LINE_COLOR} strokeWidth="0.5" />
          <rect x="18" y="113" width="64" height="22" fill="none" stroke={LINE_COLOR} strokeWidth="0.5" />
        </svg>

        {/* Players on field */}
        {slots.map((slot, idx) => {
          const assignment = assignmentAtSlot(idx);
          const player = assignment ? getPlayer(assignment.player_id) : undefined;
          const goingOff = player ? isGoingOff(player.id) : false;

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${slot.x}%`,
                top: `${slot.y * 140 / 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
              onDragOver={e => { e.preventDefault(); }}
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
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: player ? (goingOff ? '#f59e0b' : '#fff') : 'rgba(255,255,255,0.15)',
                  border: `3px solid ${goingOff ? '#d97706' : '#fff'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: player ? 'grab' : 'default',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                {goingOff && <span style={{ position: 'absolute', top: -8, right: -4, fontSize: 14 }}>🔄</span>}
              </div>
              {player && (
                <div style={{
                  position: 'absolute', top: 46, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: 4,
                  fontSize: 11, fontWeight: 700, padding: '1px 5px', whiteSpace: 'nowrap',
                }}>
                  {displayName(player)}
                </div>
              )}
            </div>
          );
        })}

        {/* Substitution arrows */}
        {showSubArrows && substitutions.map((sub, i) => {
          const fromAssign = assignments.find(a => a.player_id === sub.out_player_id);
          const toAssign = nextAssignments.find(a => a.player_id === sub.in_player_id);
          if (!fromAssign || !toAssign) return null;
          const fromSlot = slots[fromAssign.slot_index];
          const toSlot = slots[toAssign.slot_index];
          if (!fromSlot || !toSlot) return null;
          return (
            <svg key={i} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              viewBox="0 0 100 140" preserveAspectRatio="none">
              <defs>
                <marker id={`arrow${i}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
                </marker>
              </defs>
              <line
                x1={fromSlot.x} y1={fromSlot.y * 140 / 100}
                x2={toSlot.x} y2={toSlot.y * 140 / 100}
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2"
                markerEnd={`url(#arrow${i})`}
              />
            </svg>
          );
        })}
      </div>

      {/* Bench */}
      {benchIds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 6 }}>AVBYTARE</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {benchIds.map(id => {
              const p = getPlayer(id);
              const comingOn = substitutions.some(s => s.in_player_id === id);
              if (!p) return null;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('playerId', id)}
                  style={{
                    background: comingOn ? '#dcfce7' : '#f3f4f6',
                    border: `2px solid ${comingOn ? '#16a34a' : '#e5e7eb'}`,
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'grab',
                    position: 'relative',
                  }}
                >
                  {comingOn && <span style={{ marginRight: 4 }}>🟢</span>}
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
