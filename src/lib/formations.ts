import type { Formation } from '../types';

// Half-pitch view: y=0 is midfield line, y=100 is our goal
// x=0 left, x=100 right
// Positions: GK, CB (innerback), WB (ytterback), CM (innermittfältare), WM (yttermittfältare), ST (anfallare)

export const FORMATIONS: Record<string, Formation> = {
  '3-4-1': {
    name: '3-4-1',
    slots: [
      { position: 'GK', x: 50, y: 94 },
      // 3 backs
      { position: 'CB', x: 25, y: 76 },
      { position: 'CB', x: 50, y: 76 },
      { position: 'CB', x: 75, y: 76 },
      // 4 midfielders
      { position: 'WM', x: 15, y: 52 },
      { position: 'CM', x: 38, y: 52 },
      { position: 'CM', x: 62, y: 52 },
      { position: 'WM', x: 85, y: 52 },
      // 1 striker
      { position: 'ST', x: 50, y: 22 },
    ],
  },
  '3-2-3': {
    name: '3-2-3',
    slots: [
      { position: 'GK', x: 50, y: 94 },
      { position: 'WB', x: 20, y: 76 },
      { position: 'CB', x: 50, y: 76 },
      { position: 'WB', x: 80, y: 76 },
      { position: 'CM', x: 35, y: 52 },
      { position: 'CM', x: 65, y: 52 },
      { position: 'WM', x: 15, y: 26 },
      { position: 'ST', x: 50, y: 22 },
      { position: 'WM', x: 85, y: 26 },
    ],
  },
  '3-3-2': {
    name: '3-3-2',
    slots: [
      { position: 'GK', x: 50, y: 94 },
      { position: 'WB', x: 20, y: 76 },
      { position: 'CB', x: 50, y: 76 },
      { position: 'WB', x: 80, y: 76 },
      { position: 'WM', x: 18, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'WM', x: 82, y: 52 },
      { position: 'ST', x: 35, y: 24 },
      { position: 'ST', x: 65, y: 24 },
    ],
  },
  '2-4-2': {
    name: '2-4-2',
    slots: [
      { position: 'GK', x: 50, y: 94 },
      { position: 'CB', x: 30, y: 76 },
      { position: 'CB', x: 70, y: 76 },
      { position: 'WM', x: 12, y: 52 },
      { position: 'CM', x: 36, y: 52 },
      { position: 'CM', x: 64, y: 52 },
      { position: 'WM', x: 88, y: 52 },
      { position: 'ST', x: 35, y: 24 },
      { position: 'ST', x: 65, y: 24 },
    ],
  },
};

export const DEFAULT_FORMATION = '3-4-1';
