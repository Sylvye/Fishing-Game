import { fishById } from '../data/fish';
import { baitById, boatById, chumById, lureById, rodById } from '../data/items';
import type { AttractorKind, AttractorProfile, Chum, CaughtFish, FishSpecies, PlayerSave, ShopItemKind, ShopItemView } from '../types';

const rarityWeights: Record<FishSpecies['rarity'], number> = {
  common: 1,
  uncommon: 0.72,
  rare: 0.32,
  legendary: 0.08,
};

const saleValueMultiplier = 0.4;

const gaussianRandom = (random: () => number): number => {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

export const randomFishWeight = (species: FishSpecies, random = Math.random): number => {
  const min = species.minimumWeightLb;
  const average = species.averageWeightLb;
  const max = species.trophyWeightLb;
  const standardDeviation = Math.max(0.05, (max - min) / 6);
  let weight = average;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    weight = average + gaussianRandom(random) * standardDeviation;
    if (weight >= min && weight <= max) {
      break;
    }
  }

  return Number(Math.min(max, Math.max(min, weight)).toFixed(2));
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

export const attractionTagScore = (fish: FishSpecies, attractorTags: string[], attractorKind: AttractorKind): number => {
  if (!fish.attractionTags.includes(attractorKind) || !attractorTags.includes(attractorKind)) {
    return 0;
  }
  return attractorTags.reduce((score, tag) => score + (fish.attractionTags.includes(tag) ? 1 : 0), 0);
};

export const attractionChanceForFish = (fish: FishSpecies, attractor: AttractorProfile, attractorKind: AttractorKind): number => {
  const score = attractionTagScore(fish, attractor.tags, attractorKind);
  if (score <= 0) {
    return 0;
  }
  return Math.min(0.95, attractor.attractChance * (0.35 + score * 0.18));
};

const chumWeightForFish = (fish: FishSpecies, chum?: Chum): number => {
  if (!chum) {
    return 1;
  }
  const speciesBonus = chum.targetSpeciesIds.includes(fish.id) ? 2.4 : 1;
  const tagMatches = chum.tags.filter((tag) => fish.attractionTags.includes(tag)).length;
  return speciesBonus * (1 + tagMatches * 0.28 + chum.rarityBonus);
};

export const chooseWeightedFish = (
  speciesIds: string[],
  depthRatio: number,
  attractor: AttractorProfile,
  attractorKind: AttractorKind,
  chum?: Chum,
  random = Math.random,
): FishSpecies => {
  const candidates = speciesIds
    .map((id) => fishById.get(id))
    .filter((fish): fish is FishSpecies => Boolean(fish))
    .filter((fish) => depthRatio >= fish.depthRange[0] - 0.08 && depthRatio <= fish.depthRange[1] + 0.08);

  const pool = candidates.length > 0 ? candidates : speciesIds.map((id) => fishById.get(id)).filter(Boolean) as FishSpecies[];
  const weights = pool.map((fish) => {
    const tagScore = attractionTagScore(fish, attractor.tags, attractorKind);
    const tagBonus = tagScore > 0 ? 1 + tagScore * 0.24 * attractor.attractionBonus : 1;
    const rareBoost = fish.rarity === 'rare' || fish.rarity === 'legendary' ? 1 + attractor.rarityBonus + (chum?.rarityBonus ?? 0) : 1;
    return rarityWeights[fish.rarity] * tagBonus * rareBoost * chumWeightForFish(fish, chum);
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

export const consumeBaitUse = (save: PlayerSave, baitId: string): PlayerSave => {
  const currentUses = save.baitInventory[baitId] ?? 0;
  if (currentUses <= 0) {
    return { ...save, activeAttractorKind: 'lure' };
  }

  const nextUses = currentUses - 1;
  const baitInventory = { ...save.baitInventory, [baitId]: nextUses };
  if (nextUses <= 0) {
    delete baitInventory[baitId];
  }

  return {
    ...save,
    baitInventory,
    activeAttractorKind: nextUses > 0 ? save.activeAttractorKind : 'lure',
  };
};

export const buyOrEquipItem = (save: PlayerSave, kind: ShopItemKind, id: string, now = Date.now()): PlayerSave => {
  if (kind === 'bait') {
    const bait = baitById.get(id);
    if (!bait) {
      return save;
    }
    const currentUses = save.baitInventory[id] ?? 0;
    if (currentUses > 0 && (save.equippedBaitId !== id || save.activeAttractorKind !== 'bait')) {
      return { ...save, equippedBaitId: id, activeAttractorKind: 'bait' };
    }
    if (save.money < bait.price) {
      return save;
    }
    return {
      ...save,
      money: save.money - bait.price,
      baitInventory: {
        ...save.baitInventory,
        [id]: currentUses + bait.usesPerPurchase,
      },
      equippedBaitId: id,
      activeAttractorKind: 'bait',
    };
  }

  if (kind === 'chum') {
    const chum = chumById.get(id);
    if (!chum || save.money < chum.price) {
      return save;
    }
    return {
      ...save,
      money: save.money - chum.price,
      activeChumId: id,
      chumExpiresAt: now + chum.durationSeconds * 1000,
    };
  }

  const config = kind === 'rod' ? rodById.get(id) : kind === 'lure' ? lureById.get(id) : boatById.get(id);
  if (!config) {
    return save;
  }

  const ownedKey = kind === 'rod' ? 'ownedRodIds' : kind === 'lure' ? 'ownedLureIds' : 'ownedBoatIds';
  const equippedKey = kind === 'rod' ? 'equippedRodId' : kind === 'lure' ? 'equippedLureId' : 'equippedBoatId';
  const ownedIds = save[ownedKey];
  if (ownedIds.includes(id)) {
    return { ...save, [equippedKey]: id, activeAttractorKind: kind === 'lure' ? 'lure' : save.activeAttractorKind };
  }
  if (save.money < config.price) {
    return save;
  }
  return {
    ...save,
    money: save.money - config.price,
    [ownedKey]: [...ownedIds, id],
    [equippedKey]: id,
    activeAttractorKind: kind === 'lure' ? 'lure' : save.activeAttractorKind,
  };
};

export const getShopItems = (save: PlayerSave, now = Date.now()): ShopItemView[] => [
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
    equipped: save.activeAttractorKind === 'lure' && save.equippedLureId === lure.id,
    detail: `${lure.targetDepth} lure, ${lure.attractRadius}px pull, tags: ${lure.tags.filter((tag) => tag !== 'lure').join(', ')}`,
  })),
  ...Array.from(baitById.values()).map((bait) => {
    const quantity = save.baitInventory[bait.id] ?? 0;
    return {
      kind: 'bait' as const,
      id: bait.id,
      displayName: bait.displayName,
      price: bait.price,
      owned: quantity > 0,
      equipped: save.activeAttractorKind === 'bait' && save.equippedBaitId === bait.id && quantity > 0,
      quantity,
      detail: `${quantity} uses. ${bait.targetDepth} bait, ${bait.attractRadius}px pull, tags: ${bait.tags.filter((tag) => tag !== 'bait').join(', ')}`,
    };
  }),
  ...Array.from(chumById.values()).map((chum) => ({
    kind: 'chum' as const,
    id: chum.id,
    displayName: chum.displayName,
    price: chum.price,
    owned: false,
    equipped: false,
    active: save.activeChumId === chum.id && (save.chumExpiresAt ?? 0) > now,
    detail: `${chum.durationSeconds}s, spawns x${chum.spawnMultiplier.toFixed(2)}, favors ${chum.targetSpeciesIds.join(', ')}`,
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
