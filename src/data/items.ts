import type { Boat, Lure, Rod } from '../types';

export const rods: Rod[] = [
  { id: 'twig-rod', displayName: 'Twig Rod', price: 0, maxCastDistance: 260, reelSpeed: 95, weightHandling: 6 },
  { id: 'bamboo-rod', displayName: 'Bamboo Rod', price: 120, maxCastDistance: 340, reelSpeed: 120, weightHandling: 12 },
  { id: 'graphite-rod', displayName: 'Graphite Rod', price: 420, maxCastDistance: 440, reelSpeed: 150, weightHandling: 22 },
  { id: 'tournament-rod', displayName: 'Tournament Rod', price: 1050, maxCastDistance: 560, reelSpeed: 180, weightHandling: 36 },
];

export const lures: Lure[] = [
  {
    id: 'starter-bobber',
    displayName: 'Starter Bobber',
    price: 0,
    attractionBonus: 1,
    rarityBonus: 0,
    targetDepth: 'surface',
    tags: ['insect', 'small'],
  },
  {
    id: 'silver-spoon',
    displayName: 'Silver Spoon',
    price: 90,
    attractionBonus: 1.1,
    rarityBonus: 0.08,
    targetDepth: 'mid',
    tags: ['spoon', 'spinner'],
  },
  {
    id: 'minnow-crank',
    displayName: 'Minnow Crank',
    price: 260,
    attractionBonus: 1.24,
    rarityBonus: 0.14,
    targetDepth: 'mid',
    tags: ['minnow', 'spinner'],
  },
  {
    id: 'scented-sinker',
    displayName: 'Scented Sinker',
    price: 380,
    attractionBonus: 1.18,
    rarityBonus: 0.1,
    targetDepth: 'deep',
    tags: ['scent', 'deep'],
  },
];

export const boats: Boat[] = [
  { id: 'dock', displayName: 'Dock', price: 0, moveSpeed: 115, cashMultiplier: 1 },
  { id: 'rowboat', displayName: 'Rowboat', price: 300, moveSpeed: 180, cashMultiplier: 1.2 },
  { id: 'bass-boat', displayName: 'Bass Boat', price: 900, moveSpeed: 255, cashMultiplier: 1.4 },
];

export const rodById = new Map(rods.map((item) => [item.id, item]));
export const lureById = new Map(lures.map((item) => [item.id, item]));
export const boatById = new Map(boats.map((item) => [item.id, item]));
