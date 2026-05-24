import { fishById } from '../data/fish';
import { boatById, lureById, rodById } from '../data/items';
import type { CaughtFish, FishSpecies, PlayerSave, ShopItemView } from '../types';

const rarityWeights: Record<FishSpecies['rarity'], number> = {
  common: 1,
  uncommon: 0.72,
  rare: 0.32,
  legendary: 0.08,
};

const saleValueMultiplier = 0.4;

export const randomFishWeight = (species: FishSpecies, random = Math.random): number => {
  const [min, max] = species.weightRangeLb;
  const biased = Math.pow(random(), 2.25);
  return Number((min + (max - min) * biased).toFixed(2));
};

export const fishValue = (species: FishSpecies, weightLb: number): number =>
  Math.max(1, Math.round((species.baseValue + weightLb * species.valuePerLb) * species.rarityMultiplier * saleValueMultiplier));

export const createCaughtFish = (species: FishSpecies, weightLb = randomFishWeight(species), random = Math.random): CaughtFish => {
  return {
    id: `${species.id}-${Date.now()}-${Math.floor(random() * 100000)}`,
    speciesId: species.id,
    displayName: species.displayName,
    weightLb,
    value: fishValue(species, weightLb),
    caughtAt: new Date().toISOString(),
  };
};

export const applySaleMultiplier = (caught: CaughtFish, multiplier: number): CaughtFish => ({
  ...caught,
  value: Math.max(1, Math.round(caught.value * multiplier)),
});

export const chooseWeightedFish = (
  speciesIds: string[],
  depthRatio: number,
  lureTags: string[],
  rarityBonus: number,
  random = Math.random,
): FishSpecies => {
  const candidates = speciesIds
    .map((id) => fishById.get(id))
    .filter((fish): fish is FishSpecies => Boolean(fish))
    .filter((fish) => depthRatio >= fish.depthRange[0] - 0.08 && depthRatio <= fish.depthRange[1] + 0.08);

  const pool = candidates.length > 0 ? candidates : speciesIds.map((id) => fishById.get(id)).filter(Boolean) as FishSpecies[];
  const weights = pool.map((fish) => {
    const tagBonus = fish.attractionTags.some((tag) => lureTags.includes(tag)) ? 1.55 : 1;
    const rareBoost = fish.rarity === 'rare' || fish.rarity === 'legendary' ? 1 + rarityBonus : 1;
    return rarityWeights[fish.rarity] * tagBonus * rareBoost;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = random() * total;
  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return pool[index];
    }
  }
  return pool[0];
};

export const recordCatch = (save: PlayerSave, caught: CaughtFish): PlayerSave => {
  const previous = save.catchLog[caught.speciesId] ?? { count: 0, bestWeightLb: 0, totalValue: 0 };
  return {
    ...save,
    money: save.money + caught.value,
    catchLog: {
      ...save.catchLog,
      [caught.speciesId]: {
        count: previous.count + 1,
        bestWeightLb: Math.max(previous.bestWeightLb, caught.weightLb),
        totalValue: previous.totalValue + caught.value,
      },
    },
  };
};

export const buyOrEquipItem = (save: PlayerSave, kind: 'rod' | 'lure' | 'boat', id: string): PlayerSave => {
  const config = kind === 'rod' ? rodById.get(id) : kind === 'lure' ? lureById.get(id) : boatById.get(id);
  if (!config) {
    return save;
  }

  const ownedKey = kind === 'rod' ? 'ownedRodIds' : kind === 'lure' ? 'ownedLureIds' : 'ownedBoatIds';
  const equippedKey = kind === 'rod' ? 'equippedRodId' : kind === 'lure' ? 'equippedLureId' : 'equippedBoatId';
  const ownedIds = save[ownedKey];
  if (ownedIds.includes(id)) {
    return { ...save, [equippedKey]: id };
  }
  if (save.money < config.price) {
    return save;
  }
  return {
    ...save,
    money: save.money - config.price,
    [ownedKey]: [...ownedIds, id],
    [equippedKey]: id,
  };
};

export const getShopItems = (save: PlayerSave): ShopItemView[] => [
  ...Array.from(rodById.values()).map((rod) => ({
    kind: 'rod' as const,
    id: rod.id,
    displayName: rod.displayName,
    price: rod.price,
    owned: save.ownedRodIds.includes(rod.id),
    equipped: save.equippedRodId === rod.id,
    detail: `Line ${rod.maxCastDistance}, reel ${rod.reelSpeed}, handles ${rod.weightHandling} lb`,
  })),
  ...Array.from(lureById.values()).map((lure) => ({
    kind: 'lure' as const,
    id: lure.id,
    displayName: lure.displayName,
    price: lure.price,
    owned: save.ownedLureIds.includes(lure.id),
    equipped: save.equippedLureId === lure.id,
    detail: `${lure.targetDepth} lure, tags: ${lure.tags.join(', ')}`,
  })),
  ...Array.from(boatById.values()).map((boat) => ({
    kind: 'boat' as const,
    id: boat.id,
    displayName: boat.displayName,
    price: boat.price,
    owned: save.ownedBoatIds.includes(boat.id),
    equipped: save.equippedBoatId === boat.id,
    detail: `Boat speed ${boat.moveSpeed}, fish sales +${Math.round((boat.cashMultiplier - 1) * 100)}%`,
  })),
];
