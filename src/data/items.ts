import type { Bait, Boat, Chum, Lure, Rod } from '../types';

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
    tags: ['lure', 'insect', 'small'],
    attractRadius: 90,
    attractChance: 0.18,
    attractStrength: 55,
  },
  {
    id: 'silver-spoon',
    displayName: 'Silver Spoon',
    price: 90,
    attractionBonus: 1.1,
    rarityBonus: 0.08,
    targetDepth: 'mid',
    tags: ['lure', 'spoon', 'spinner'],
    attractRadius: 145,
    attractChance: 0.48,
    attractStrength: 92,
  },
  {
    id: 'minnow-crank',
    displayName: 'Minnow Crank',
    price: 260,
    attractionBonus: 1.24,
    rarityBonus: 0.14,
    targetDepth: 'mid',
    tags: ['lure', 'minnow', 'spinner'],
    attractRadius: 165,
    attractChance: 0.58,
    attractStrength: 112,
  },
  {
    id: 'scented-sinker',
    displayName: 'Deep Jig',
    price: 380,
    attractionBonus: 1.18,
    rarityBonus: 0.1,
    targetDepth: 'deep',
    tags: ['lure', 'jig', 'minnow', 'deep'],
    attractRadius: 150,
    attractChance: 0.44,
    attractStrength: 96,
  },
];

export const baits: Bait[] = [
  {
    id: 'red-worms',
    displayName: 'Red Worms',
    price: 8,
    usesPerPurchase: 5,
    attractionBonus: 1.08,
    rarityBonus: 0,
    targetDepth: 'surface',
    tags: ['bait', 'worm', 'insect', 'small'],
    attractRadius: 135,
    attractChance: 0.72,
    attractStrength: 84,
  },
  {
    id: 'dough-balls',
    displayName: 'Dough Balls',
    price: 10,
    usesPerPurchase: 5,
    attractionBonus: 1.05,
    rarityBonus: 0,
    targetDepth: 'deep',
    tags: ['bait', 'dough', 'scent', 'deep'],
    attractRadius: 120,
    attractChance: 0.62,
    attractStrength: 70,
  },
  {
    id: 'stink-bait',
    displayName: 'Stink Bait',
    price: 14,
    usesPerPurchase: 4,
    attractionBonus: 1.14,
    rarityBonus: 0.04,
    targetDepth: 'deep',
    tags: ['bait', 'scent', 'catfish', 'deep'],
    attractRadius: 160,
    attractChance: 0.78,
    attractStrength: 78,
  },
  {
    id: 'live-minnows',
    displayName: 'Live Minnows',
    price: 18,
    usesPerPurchase: 4,
    attractionBonus: 1.12,
    rarityBonus: 0.06,
    targetDepth: 'mid',
    tags: ['bait', 'minnow'],
    attractRadius: 130,
    attractChance: 0.42,
    attractStrength: 82,
  },
];

export const chums: Chum[] = [
  {
    id: 'panfish-crumbs',
    displayName: 'Panfish Crumbs',
    price: 18,
    durationSeconds: 45,
    spawnMultiplier: 1.65,
    tags: ['bait', 'insect', 'small'],
    targetSpeciesIds: ['bluegill'],
    rarityBonus: 0,
  },
  {
    id: 'minnow-cloud',
    displayName: 'Minnow Cloud',
    price: 32,
    durationSeconds: 45,
    spawnMultiplier: 1.55,
    tags: ['minnow'],
    targetSpeciesIds: ['largemouth-bass', 'smallmouth-bass', 'walleye'],
    rarityBonus: 0.08,
  },
  {
    id: 'bottom-stink',
    displayName: 'Bottom Stink',
    price: 28,
    durationSeconds: 50,
    spawnMultiplier: 1.6,
    tags: ['bait', 'scent', 'deep'],
    targetSpeciesIds: ['channel-catfish', 'common-carp'],
    rarityBonus: 0.02,
  },
];

export const boats: Boat[] = [
  { id: 'dock', displayName: 'Dock', price: 0, moveSpeed: 115, cashMultiplier: 1 },
  { id: 'rowboat', displayName: 'Rowboat', price: 300, moveSpeed: 180, cashMultiplier: 1.2 },
  { id: 'bass-boat', displayName: 'Bass Boat', price: 900, moveSpeed: 255, cashMultiplier: 1.4 },
];

export const rodById = new Map(rods.map((item) => [item.id, item]));
export const lureById = new Map(lures.map((item) => [item.id, item]));
export const baitById = new Map(baits.map((item) => [item.id, item]));
export const chumById = new Map(chums.map((item) => [item.id, item]));
export const boatById = new Map(boats.map((item) => [item.id, item]));
