export type AssetKind = 'fish' | 'rod' | 'boat' | 'lure' | 'ui';

export interface AssetManifestEntry {
  id: string;
  kind: AssetKind;
  src: string;
  displayName: string;
  license: string;
  attribution: string;
  replacementNotes: string;
  sourceUrl?: string;
}

export interface FishSpecies {
  id: string;
  displayName: string;
  scientificName: string;
  assetId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  rarityMultiplier: number;
  depthRange: [number, number];
  speedRange: [number, number];
  weightRangeLb: [number, number];
  baseValue: number;
  valuePerLb: number;
  attractionTags: string[];
  schoolChance: number;
  schoolSizeRange: [number, number];
}

export interface CaughtFish {
  id: string;
  speciesId: string;
  displayName: string;
  weightLb: number;
  value: number;
  caughtAt: string;
}

export interface Rod {
  id: string;
  displayName: string;
  price: number;
  maxCastDistance: number;
  reelSpeed: number;
  weightHandling: number;
}

export interface Lure {
  id: string;
  displayName: string;
  price: number;
  attractionBonus: number;
  rarityBonus: number;
  targetDepth: 'surface' | 'mid' | 'deep';
  tags: string[];
}

export interface Boat {
  id: string;
  displayName: string;
  price: number;
  moveSpeed: number;
  cashMultiplier: number;
}

export interface LevelConfig {
  id: string;
  displayName: string;
  unlockRequirement?: {
    money?: number;
    boatId?: string;
  };
  depth: number;
  fishPool: string[];
  palette: {
    skyTop: number;
    skyBottom: number;
    shore: number;
    waterTop: number;
    waterMid: number;
    waterBottom: number;
    lakeBed: number;
  };
  spawnIntervalMs: [number, number];
}

export interface PlayerSave {
  version: 1;
  money: number;
  ownedRodIds: string[];
  ownedLureIds: string[];
  ownedBoatIds: string[];
  equippedRodId: string;
  equippedLureId: string;
  equippedBoatId: string;
  unlockedLevelIds: string[];
  catchLog: Record<string, { count: number; bestWeightLb: number; totalValue: number }>;
}

export type ShopItemKind = 'rod' | 'lure' | 'boat';

export interface ShopItemView {
  kind: ShopItemKind;
  id: string;
  displayName: string;
  price: number;
  owned: boolean;
  equipped: boolean;
  detail: string;
}
