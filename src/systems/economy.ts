import { fishById } from '../data/fish';
import { baitById, boatById, chumById, crabPotById, lureById, rodById, shopCatalogs } from '../data/items';
import { levelById } from '../data/levels';
import { defaultLevelSave, getLevelSave } from './save';
import type { AttractorKind, AttractorProfile, Chum, CaughtFish, FishSpecies, LevelConfig, Lure, PlayerLevelSave, PlayerSave, ShopItemKind, ShopItemView } from '../types';

const rarityWeights: Record<FishSpecies['rarity'], number> = {
  common: 1,
  uncommon: 0.72,
  rare: 0.32,
  legendary: 0.08,
};

const saleValueMultiplier = 0.4;
const present = <T>(value: T | undefined): value is T => Boolean(value);

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

const stressSecondsAtRodLimit = 8;
const extraHookedFishTensionMultiplier = 0.12;

export const totalHookedWeight = (hookedFish: { weightLb: number }[]): number =>
  hookedFish.reduce((total, fish) => total + fish.weightLb, 0);

export const effectiveLineLoadRatio = (
  hookedFish: { weightLb: number }[],
  weightHandling: number,
  lure?: Pick<Lure, 'soloStressMultiplier'>,
): number => {
  if (hookedFish.length === 0 || weightHandling <= 0) {
    return 0;
  }

  const loadRatio = totalHookedWeight(hookedFish) / weightHandling;
  const multiFishMultiplier = 1 + Math.max(0, hookedFish.length - 1) * extraHookedFishTensionMultiplier;
  const soloStressMultiplier = hookedFish.length === 1 ? lure?.soloStressMultiplier ?? 1 : 1;

  return loadRatio * multiFishMultiplier * soloStressMultiplier;
};

export const lineStressGainPerSecond = (
  hookedFish: { weightLb: number }[],
  weightHandling: number,
  lure?: Pick<Lure, 'soloStressMultiplier'>,
): number => effectiveLineLoadRatio(hookedFish, weightHandling, lure) / stressSecondsAtRodLimit;

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

export const recordCatch = (save: PlayerLevelSave, caught: CaughtFish): PlayerLevelSave => {
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

export const recordCrabCatch = (save: PlayerLevelSave, value: number, now = Date.now()): PlayerLevelSave => {
  const previous = save.crabCatchLog ?? { count: 0, totalValue: 0 };
  return {
    ...save,
    money: save.money + value,
    crabCatchLog: {
      count: previous.count + 1,
      totalValue: previous.totalValue + value,
      lastCatchAt: now,
    },
  };
};

export const consumeBaitUse = (save: PlayerLevelSave, baitId: string): PlayerLevelSave => {
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

export const buyOrEquipItem = (save: PlayerLevelSave, kind: ShopItemKind, id: string, now = Date.now()): PlayerLevelSave => {
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

  if (kind === 'crab-pot') {
    const crabPot = crabPotById.get(id);
    if (!crabPot || save.ownedCrabPotIds.includes(id) || save.money < crabPot.price) {
      return save;
    }
    return {
      ...save,
      money: save.money - crabPot.price,
      ownedCrabPotIds: [...save.ownedCrabPotIds, id],
    };
  }

  if (kind === 'ferry-ticket') {
    return save;
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

const catalogIds = (level: LevelConfig, kind: ShopItemKind): string[] => shopCatalogs[level.shopCatalogId][kind] ?? [];

export const canBuyFerryTicket = (save: PlayerSave, level: LevelConfig): boolean => {
  const nextLevelId = level.nextLevelId;
  if (!nextLevelId || !level.ferryTicketPrice || !level.finalBoatId || save.unlockedLevelIds.includes(nextLevelId)) {
    return false;
  }
  const levelSave = getLevelSave(save, level.id);
  return levelSave.ownedBoatIds.includes(level.finalBoatId) && levelSave.money >= level.ferryTicketPrice;
};

export const buyFerryTicket = (save: PlayerSave, level: LevelConfig): PlayerSave => {
  const nextLevelId = level.nextLevelId;
  if (!nextLevelId || !level.ferryTicketPrice || !canBuyFerryTicket(save, level)) {
    return save;
  }
  const currentLevelSave = getLevelSave(save, level.id);
  return {
    ...save,
    currentLevelId: nextLevelId,
    unlockedLevelIds: [...save.unlockedLevelIds, nextLevelId],
    levels: {
      ...save.levels,
      [level.id]: {
        ...currentLevelSave,
        money: currentLevelSave.money - level.ferryTicketPrice,
      },
      [nextLevelId]: defaultLevelSave(nextLevelId),
    },
  };
};

export const getShopItems = (save: PlayerSave, now = Date.now()): ShopItemView[] => {
  const level = levelById.get(save.currentLevelId);
  if (!level) {
    return [];
  }
  const levelSave = getLevelSave(save, level.id);
  const itemViews: ShopItemView[] = [
  ...catalogIds(level, 'rod').map((id) => rodById.get(id)).filter(present).map((rod) => ({
    kind: 'rod' as const,
    id: rod.id,
    displayName: rod.displayName,
    price: rod.price,
    owned: levelSave.ownedRodIds.includes(rod.id),
    equipped: levelSave.equippedRodId === rod.id,
    detail: `Line ${rod.maxCastDistance}, reel ${rod.reelSpeed}, handles ${rod.weightHandling} lb`,
  })),
  ...catalogIds(level, 'lure').map((id) => lureById.get(id)).filter(present).map((lure) => ({
    kind: 'lure' as const,
    id: lure.id,
    displayName: lure.displayName,
    price: lure.price,
    owned: levelSave.ownedLureIds.includes(lure.id),
    equipped: levelSave.activeAttractorKind === 'lure' && levelSave.equippedLureId === lure.id,
    detail: `${lure.targetDepth} lure, ${lure.attractRadius}px pull, tags: ${lure.tags.filter((tag) => tag !== 'lure').join(', ')}${lure.soloStressMultiplier ? `, solo stress -${Math.round((1 - lure.soloStressMultiplier) * 100)}%` : ''}`,
  })),
  ...catalogIds(level, 'bait').map((id) => baitById.get(id)).filter(present).map((bait) => {
    const quantity = levelSave.baitInventory[bait.id] ?? 0;
    return {
      kind: 'bait' as const,
      id: bait.id,
      displayName: bait.displayName,
      price: bait.price,
      owned: quantity > 0,
      equipped: levelSave.activeAttractorKind === 'bait' && levelSave.equippedBaitId === bait.id && quantity > 0,
      quantity,
      detail: `${quantity} uses. ${bait.targetDepth} bait, ${bait.attractRadius}px pull, tags: ${bait.tags.filter((tag) => tag !== 'bait').join(', ')}`,
    };
  }),
  ...catalogIds(level, 'chum').map((id) => chumById.get(id)).filter(present).map((chum) => ({
    kind: 'chum' as const,
    id: chum.id,
    displayName: chum.displayName,
    price: chum.price,
    owned: false,
    equipped: false,
    active: levelSave.activeChumId === chum.id && (levelSave.chumExpiresAt ?? 0) > now,
    detail: `${chum.durationSeconds}s, spawns x${chum.spawnMultiplier.toFixed(2)}, favors ${chum.targetSpeciesIds.join(', ')}`,
  })),
  ...catalogIds(level, 'boat').map((id) => boatById.get(id)).filter(present).map((boat) => ({
    kind: 'boat' as const,
    id: boat.id,
    displayName: boat.displayName,
    price: boat.price,
    owned: levelSave.ownedBoatIds.includes(boat.id),
    equipped: levelSave.equippedBoatId === boat.id,
    detail: `Boat speed ${boat.moveSpeed}, fish sales +${Math.round((boat.cashMultiplier - 1) * 100)}%`,
  })),
  ...catalogIds(level, 'crab-pot').map((id) => crabPotById.get(id)).filter(present).map((pot) => ({
    kind: 'crab-pot' as const,
    id: pot.id,
    displayName: pot.displayName,
    price: pot.price,
    owned: levelSave.ownedCrabPotIds.includes(pot.id),
    equipped: levelSave.ownedCrabPotIds.includes(pot.id),
    detail: `Passive ${level.crabMechanic?.speciesName ?? 'crab'} catches every ${pot.catchIntervalSeconds}s for about $${pot.valuePerCatch}.`,
  })),
  ];

  if (level.nextLevelId && level.ferryTicketPrice && level.finalBoatId && !save.unlockedLevelIds.includes(level.nextLevelId)) {
    itemViews.push({
      kind: 'ferry-ticket',
      id: `ferry-${level.id}-${level.nextLevelId}`,
      displayName: 'Ferry Ticket',
      price: level.ferryTicketPrice,
      owned: false,
      equipped: false,
      active: levelSave.ownedBoatIds.includes(level.finalBoatId),
      unlocksLevelId: level.nextLevelId,
      detail: levelSave.ownedBoatIds.includes(level.finalBoatId)
        ? 'Unlocks the next location. Money and tackle do not transfer.'
        : `Requires ${boatById.get(level.finalBoatId)?.displayName ?? 'the final boat'} for this location.`,
    });
  }

  return itemViews;
};
