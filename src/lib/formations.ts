import type { Formation } from '../types';

// 9v9 formations — positions as % of HALF pitch (our half only)
// y=0 = attack top, y=100 = GK bottom
// Positions: GK, CB (innerback), WB (ytterback), CM (innermittfältare), WM (yttermittfältare), ST (anfallare)

export const FORMATIONS: Record<string, Formation> = {
  '3-4-1': {
    name: '3-4-1',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 18, y: 72 },
      { position: 'CB', x: 50, y: 72 },
      { position: 'WB', x: 82, y: 72 },
      { position: 'WM', x: 15, y: 48 },
      { position: 'CM', x: 37, y: 52 },
      { position: 'CM', x: 63, y: 52 },
      { position: 'WM', x: 85, y: 48 },
      { position: 'ST', x: 50, y: 20 },
    ],
  },
  '3-2-3': {
    name: '3-2-3',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 18, y: 72 },
      { position: 'CB', x: 50, y: 72 },
      { position: 'WB', x: 82, y: 72 },
      { position: 'CM', x: 35, y: 52 },
      { position: 'CM', x: 65, y: 52 },
      { position: 'WM', x: 15, y: 28 },
      { position: 'ST', x: 50, y: 22 },
      { position: 'WM', x: 85, y: 28 },
    ],
  },
  '3-3-2': {
    name: '3-3-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'WB', x: 18, y: 72 },
      { position: 'CB', x: 50, y: 72 },
      { position: 'WB', x: 82, y: 72 },
      { position: 'WM', x: 18, y: 50 },
      { position: 'CM', x: 50, y: 50 },
      { position: 'WM', x: 82, y: 50 },
      { position: 'ST', x: 35, y: 24 },
      { position: 'ST', x: 65, y: 24 },
    ],
  },
  '2-4-2': {
    name: '2-4-2',
    slots: [
      { position: 'GK', x: 50, y: 92 },
      { position: 'CB', x: 32, y: 72 },
      { position: 'CB', x: 68, y: 72 },
      { position: 'WM', x: 14, y: 50 },
      { position: 'CM', x: 36, y: 54 },
      { position: 'CM', x: 64, y: 54 },
      { position: 'WM', x: 86, y: 50 },
      { position: 'ST', x: 35, y: 24 },
      { position: 'ST', x: 65, y: 24 },
    ],
  },
};

export const DEFAULT_FORMATION = '3-4-1';
