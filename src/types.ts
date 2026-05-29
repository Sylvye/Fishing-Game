export type AssetKind = 'fish' | 'rod' | 'boat' | 'lure' | 'bait' | 'chum' | 'ui';
export type AttractorKind = 'lure' | 'bait';
export type TargetDepth = 'surface' | 'mid' | 'deep';
export type LevelId = 'river' | 'lake' | 'estuary' | 'coral-reef';
export type LevelMechanic = 'swarm' | 'rain' | 'crab' | 'reef-hazards';

export interface AssetManifestEntry {
  id: string;
  kind: AssetKind;
  src: string;
  variants?: AssetVariant[];
  displayName: string;
  license: string;
  attribution: string;
  replacementNotes: string;
  sourceUrl?: string;
}

export interface AssetVariant {
  id: string;
  src: string;
  displayName: string;
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
  visualLengthInches: number;
  minimumWeightLb: number;
  averageWeightLb: number;
  trophyWeightLb: number;
  baseValue: number;
  valuePerLb: number;
  attractionTags: string[];
  behaviorTags: string[];
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

export interface AttractorProfile {
  attractionBonus: number;
  rarityBonus: number;
  targetDepth: TargetDepth;
  tags: string[];
  attractRadius: number;
  attractChance: number;
  attractStrength: number;
}

export interface Lure extends AttractorProfile {
  id: string;
  displayName: string;
  price: number;
  soloStressMultiplier?: number;
}

export interface Bait extends AttractorProfile {
  id: string;
  displayName: string;
  price: number;
  usesPerPurchase: number;
}

export interface Chum {
  id: string;
  displayName: string;
  price: number;
  durationSeconds: number;
  spawnMultiplier: number;
  tags: string[];
  targetSpeciesIds: string[];
  rarityBonus: number;
}

export interface CrabPot {
  id: string;
  displayName: string;
  price: number;
  catchIntervalSeconds: number;
  valuePerCatch: number;
}

export interface Boat {
  id: string;
  displayName: string;
  price: number;
  moveSpeed: number;
  cashMultiplier: number;
}

export interface LevelConfig {
  id: LevelId;
  levelNumber: number;
  displayName: string;
  subtitle: string;
  shopCatalogId: LevelId;
  mechanic: LevelMechanic;
  nextLevelId?: LevelId;
  ferryTicketPrice?: number;
  finalBoatId?: string;
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
  swarmEvent?: {
    intervalMs: [number, number];
    speciesIds: string[];
    massiveSchoolSpeciesId?: string;
    massiveSchoolChance?: number;
  };
  rainEvent?: {
    intervalMs: [number, number];
    durationMs: number;
    spawnMultiplier: number;
    depthBias: number;
  };
  crabMechanic?: {
    speciesName: string;
  };
  hazards?: {
    count: number;
    snapLoadRatio: number;
  };
}

export interface PlayerSave {
  version: 2;
  currentLevelId: LevelId;
  unlockedLevelIds: LevelId[];
  levels: Partial<Record<LevelId, PlayerLevelSave>>;
}

export interface PlayerLevelSave {
  money: number;
  ownedRodIds: string[];
  ownedLureIds: string[];
  ownedBoatIds: string[];
  ownedCrabPotIds: string[];
  baitInventory: Record<string, number>;
  equippedRodId: string;
  equippedLureId: string;
  equippedBaitId: string;
  equippedBoatId: string;
  activeAttractorKind: AttractorKind;
  activeChumId?: string;
  chumExpiresAt?: number;
  catchLog: Record<string, { count: number; bestWeightLb: number; totalValue: number }>;
  crabCatchLog?: { count: number; totalValue: number; lastCatchAt?: number };
}

export type ShopItemKind = 'rod' | 'lure' | 'bait' | 'boat' | 'chum' | 'crab-pot' | 'ferry-ticket';

export interface ShopItemView {
  kind: ShopItemKind;
  id: string;
  displayName: string;
  price: number;
  owned: boolean;
  equipped: boolean;
  active?: boolean;
  quantity?: number;
  unlocksLevelId?: LevelId;
  detail: string;
}
