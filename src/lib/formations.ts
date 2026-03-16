import type { Formation } from '../types';

// 9v9 formations — positions as % of pitch (0,0 = top-left, 100,100 = bottom-right)
// GK at bottom, attack at top

export const FORMATIONS: Record<string, Formation> = {
  '3-2-3': {
    name: '3-2-3',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'LB', x: 20, y: 75 },
      { position: 'CB', x: 50, y: 75 },
      { position: 'RB', x: 80, y: 75 },
      { position: 'CM', x: 30, y: 55 },
      { position: 'CM', x: 70, y: 55 },
      { position: 'LW', x: 15, y: 30 },
      { position: 'ST', x: 50, y: 25 },
      { position: 'RW', x: 85, y: 30 },
    ],
  },
  '3-3-2': {
    name: '3-3-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'LB', x: 20, y: 75 },
      { position: 'CB', x: 50, y: 75 },
      { position: 'RB', x: 80, y: 75 },
      { position: 'LM', x: 20, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'RM', x: 80, y: 52 },
      { position: 'ST', x: 35, y: 28 },
      { position: 'ST', x: 65, y: 28 },
    ],
  },
  '4-3-1': {
    name: '4-3-1',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'LB', x: 15, y: 73 },
      { position: 'CB', x: 38, y: 73 },
      { position: 'CB', x: 62, y: 73 },
      { position: 'RB', x: 85, y: 73 },
      { position: 'LM', x: 20, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'RM', x: 80, y: 52 },
      { position: 'ST', x: 50, y: 25 },
    ],
  },
};

export const DEFAULT_FORMATION = '3-2-3';
