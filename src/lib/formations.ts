import type { Formation } from '../types';

// 9v9 formations — positions as % of pitch (0,0 = top-left, 100,100 = bottom-right)
// GK at bottom, attack at top
// Positions: GK, CB (innerback), WB (ytterback), CM (innermittfältare), WM (yttermittfältare), ST (anfallare)

export const FORMATIONS: Record<string, Formation> = {
  '3-2-3': {
    name: '3-2-3',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 20, y: 75 },
      { position: 'CB', x: 50, y: 75 },
      { position: 'WB', x: 80, y: 75 },
      { position: 'CM', x: 30, y: 55 },
      { position: 'CM', x: 70, y: 55 },
      { position: 'WM', x: 15, y: 30 },
      { position: 'ST', x: 50, y: 25 },
      { position: 'WM', x: 85, y: 30 },
    ],
  },
  '3-3-2': {
    name: '3-3-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 20, y: 75 },
      { position: 'CB', x: 50, y: 75 },
      { position: 'WB', x: 80, y: 75 },
      { position: 'WM', x: 20, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'WM', x: 80, y: 52 },
      { position: 'ST', x: 35, y: 28 },
      { position: 'ST', x: 65, y: 28 },
    ],
  },
  '1-3-3-1': {
    name: '1-3-3-1',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 15, y: 73 },
      { position: 'CB', x: 50, y: 73 },
      { position: 'WB', x: 85, y: 73 },
      { position: 'WM', x: 15, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'WM', x: 85, y: 52 },
      { position: 'ST', x: 50, y: 25 },
      { position: 'CM', x: 50, y: 38 },
    ],
  },
  '2-3-2': {
    name: '2-3-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'CB', x: 30, y: 75 },
      { position: 'CB', x: 70, y: 75 },
      { position: 'WM', x: 15, y: 52 },
      { position: 'CM', x: 50, y: 52 },
      { position: 'WM', x: 85, y: 52 },
      { position: 'WB', x: 50, y: 63 },
      { position: 'ST', x: 35, y: 28 },
      { position: 'ST', x: 65, y: 28 },
    ],
  },
};

export const DEFAULT_FORMATION = '3-2-3';
