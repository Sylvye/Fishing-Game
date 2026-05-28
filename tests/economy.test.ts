import { describe, expect, it } from 'vitest';
import { assetManifest, chooseAssetTextureId, getAssetTextureIds } from '../src/data/assets';
import { fishSpecies } from '../src/data/fish';
import { levels } from '../src/data/levels';
import { baitById, lureById } from '../src/data/items';
import { applyDeveloperCommand } from '../src/systems/devConsole';
import {
  applySaleMultiplier,
  attractionChanceForFish,
  buyFerryTicket,
  buyOrEquipItem,
  canLineHoldHookedFish,
  canBuyFerryTicket,
  consumeBaitUse,
  createCaughtFish,
  fishValue,
  getShopItems,
  randomFishWeight,
  recordCatch,
} from '../src/systems/economy';
import { defaultLevelSave, defaultSave, getLevelSave, normalizeSave, SAVE_KEY, SaveStore } from '../src/systems/save';

describe('fish economy', () => {
  it('generates gaussian weights inside species bounds', () => {
    for (const species of fishSpecies) {
      const weights = [0, 0.2, 0.55, 0.91, 0.999].map((roll) => randomFishWeight(species, () => roll));
      for (const weight of weights) {
        expect(weight).toBeGreaterThanOrEqual(species.minimumWeightLb);
        expect(weight).toBeLessThanOrEqual(species.trophyWeightLb);
      }
    }
  });

  it('uses configured average weight as the gaussian center', () => {
    for (const species of fishSpecies) {
      const rolls = [0.5, 0.25];
      expect(randomFishWeight(species, () => rolls.shift() ?? 0.5)).toBe(species.averageWeightLb);
    }
  });

  it('defines balanced schooling ranges for fish species', () => {
    const bluegill = fishSpecies.find((fish) => fish.id === 'bluegill');
    const largemouth = fishSpecies.find((fish) => fish.id === 'largemouth-bass');
    const pike = fishSpecies.find((fish) => fish.id === 'northern-pike');

    expect(bluegill?.schoolSizeRange).toEqual([2, 5]);
    expect(largemouth?.schoolSizeRange[1]).toBeLessThanOrEqual(3);
    expect(pike?.schoolSizeRange).toEqual([1, 1]);
  });

  it('increases value as weight increases for a species', () => {
    const bass = fishSpecies.find((fish) => fish.id === 'largemouth-bass');
    expect(bass).toBeDefined();
    expect(fishValue(bass!, 8)).toBeGreaterThan(fishValue(bass!, 1));
  });

  it('keeps fish sale prices below the raw species formula', () => {
    const trout = fishSpecies.find((fish) => fish.id === 'rainbow-trout');
    expect(trout).toBeDefined();
    const rawValue = Math.round((trout!.baseValue + 4 * trout!.valuePerLb) * trout!.rarityMultiplier);
    expect(fishValue(trout!, 4)).toBeLessThan(rawValue / 2);
  });

  it('can use a spawned fish weight for the final catch', () => {
    const bluegill = fishSpecies.find((fish) => fish.id === 'bluegill');
    expect(bluegill).toBeDefined();
    const caught = createCaughtFish(bluegill!, 1.75, () => 0.5);
    expect(caught.weightLb).toBe(1.75);
    expect(caught.value).toBe(fishValue(bluegill!, 1.75));
  });

  it('applies boat cash multipliers to landed fish', () => {
    const bluegill = fishSpecies.find((fish) => fish.id === 'bluegill');
    expect(bluegill).toBeDefined();
    const caught = createCaughtFish(bluegill!, 1.75, () => 0.5);
    expect(applySaleMultiplier(caught, 1.4).value).toBe(Math.round(caught.value * 1.4));
  });

  it('uses bait and lure tags to gate fish attraction', () => {
    const pike = fishSpecies.find((fish) => fish.id === 'northern-pike')!;
    const catfish = fishSpecies.find((fish) => fish.id === 'channel-catfish')!;
    const crank = lureById.get('minnow-crank')!;
    const stinkBait = baitById.get('stink-bait')!;

    expect(attractionChanceForFish(pike, crank, 'lure')).toBeGreaterThan(0);
    expect(attractionChanceForFish(pike, stinkBait, 'bait')).toBe(0);
    expect(attractionChanceForFish(catfish, stinkBait, 'bait')).toBeGreaterThan(0);
    expect(attractionChanceForFish(catfish, crank, 'lure')).toBe(0);
  });

  it('defines fearsome and stoic behavior tags for predator pressure', () => {
    const behaviorTagsById = new Map(fishSpecies.map((fish) => [fish.id, fish.behaviorTags]));

    expect(behaviorTagsById.get('northern-pike')).toContain('fearsome');
    expect(behaviorTagsById.get('bull-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('sandbar-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('blacktip-reef-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('hammerhead-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('great-barracuda')).toContain('fearsome');
    expect(behaviorTagsById.get('goliath-grouper')).toContain('stoic');
    expect(behaviorTagsById.get('red-lionfish')).toContain('stoic');
  });

  it('only high-tier lures can hold one fish over the line limit', () => {
    const starter = lureById.get('starter-bobber')!;
    const sharkPlug = lureById.get('shark-plug')!;
    const bluewater = lureById.get('bluewater-troll')!;

    expect(canLineHoldHookedFish([{ weightLb: 97 }], 96, starter)).toBe(false);
    expect(canLineHoldHookedFish([{ weightLb: 97 }], 96, sharkPlug)).toBe(true);
    expect(canLineHoldHookedFish([{ weightLb: 131 }], 130, bluewater)).toBe(true);
    expect(canLineHoldHookedFish([{ weightLb: 97 }, { weightLb: 1 }], 96, sharkPlug)).toBe(false);
    expect(canLineHoldHookedFish([{ weightLb: 50 }, { weightLb: 47 }], 96, sharkPlug)).toBe(false);
  });

  it('records sold catches into money and catch log', () => {
    const save = defaultLevelSave('river');
    const updated = recordCatch(save, {
      id: 'test',
      speciesId: 'bluegill',
      displayName: 'Bluegill',
      weightLb: 1.2,
      value: 15,
      caughtAt: new Date().toISOString(),
    });
    expect(updated.money).toBe(save.money + 15);
    expect(updated.catchLog.bluegill.count).toBe(1);
    expect(updated.catchLog.bluegill.bestWeightLb).toBe(1.2);
  });
});

describe('shop and save behavior', () => {
  it('deducts money when buying and equips the item', () => {
    const save = { ...defaultLevelSave('river'), money: 150 };
    const updated = buyOrEquipItem(save, 'rod', 'bamboo-rod');
    expect(updated.money).toBe(30);
    expect(updated.ownedRodIds).toContain('bamboo-rod');
    expect(updated.equippedRodId).toBe('bamboo-rod');
  });

  it('buys bait as consumable uses and consumes it on cast', () => {
    const save = { ...defaultLevelSave('river'), money: 50 };
    const stocked = buyOrEquipItem(save, 'bait', 'red-worms');

    expect(stocked.money).toBe(42);
    expect(stocked.baitInventory['red-worms']).toBe(5);
    expect(stocked.activeAttractorKind).toBe('bait');

    const consumed = consumeBaitUse({ ...stocked, baitInventory: { 'red-worms': 1 } }, 'red-worms');
    expect(consumed.baitInventory['red-worms']).toBeUndefined();
    expect(consumed.activeAttractorKind).toBe('lure');
  });

  it('can switch from bait back to the equipped lure', () => {
    const levelSave = buyOrEquipItem({ ...defaultLevelSave('river'), money: 50 }, 'bait', 'red-worms');
    const gameSave = { ...defaultSave(), levels: { river: levelSave } };
    const starterLure = getShopItems(gameSave).find((item) => item.id === 'starter-bobber');

    expect(starterLure?.equipped).toBe(false);

    const lureSave = buyOrEquipItem(levelSave, 'lure', 'starter-bobber');
    expect(lureSave.activeAttractorKind).toBe('lure');
  });

  it('activates chum as a timed shop purchase', () => {
    const activated = buyOrEquipItem({ ...defaultLevelSave('river'), money: 50 }, 'chum', 'panfish-crumbs', 1000);
    const gameSave = { ...defaultSave(), levels: { river: activated } };

    expect(activated.money).toBe(32);
    expect(activated.activeChumId).toBe('panfish-crumbs');
    expect(activated.chumExpiresAt).toBe(46000);
    expect(getShopItems(gameSave, 2000).find((item) => item.id === 'panfish-crumbs')?.active).toBe(true);
  });

  it('normalizes missing save fields with defaults', () => {
    const normalized = normalizeSave({ money: 99, ownedRodIds: ['twig-rod'] });
    expect(normalized.currentLevelId).toBe('lake');
    expect(normalized.unlockedLevelIds).toEqual(['river', 'lake']);
    expect(getLevelSave(normalized, 'lake').money).toBe(99);
    expect(getLevelSave(normalized, 'lake').equippedLureId).toBe('silver-spoon');
    expect(getLevelSave(normalized, 'lake').activeAttractorKind).toBe('lure');
  });

  it('reloads progress written by another save store', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    };
    const lakeStore = new SaveStore(storage);
    const shopStore = new SaveStore(storage);

    lakeStore.setCurrentLevelSave({ ...defaultLevelSave('river'), money: 150 });

    expect(JSON.parse(memory.get(SAVE_KEY) ?? '{}').levels.river.money).toBe(150);
    expect(getLevelSave(shopStore.get()).money).toBe(35);
    expect(getLevelSave(shopStore.reload()).money).toBe(150);
  });

  it('isolates saves when switching levels', () => {
    const store = new SaveStore(null);
    store.set({
      ...defaultSave(),
      currentLevelId: 'river',
      unlockedLevelIds: ['river', 'lake'],
      levels: {
        river: { ...defaultLevelSave('river'), money: 77 },
        lake: { ...defaultLevelSave('lake'), money: 22 },
      },
    });

    expect(store.getCurrentLevelSave().money).toBe(77);
    store.setCurrentLevel('lake');
    expect(store.getCurrentLevelSave().money).toBe(22);
  });

  it('unlocks the next level with a Ferry Ticket and starts a fresh local save', () => {
    const river = {
      ...defaultLevelSave('river'),
      money: 500,
      ownedBoatIds: ['dock', 'rowboat'],
      equippedBoatId: 'rowboat',
    };
    const save = { ...defaultSave(), levels: { river } };
    const riverLevel = levels[0];

    expect(canBuyFerryTicket(save, riverLevel)).toBe(true);
    const updated = buyFerryTicket(save, riverLevel);

    expect(updated.currentLevelId).toBe('lake');
    expect(updated.unlockedLevelIds).toEqual(['river', 'lake']);
    expect(getLevelSave(updated, 'river').money).toBe(50);
    expect(getLevelSave(updated, 'lake').ownedRodIds).toEqual(['bamboo-rod']);
  });

  it('applies developer money commands to the current level save', () => {
    const save = defaultSave();
    const result = applyDeveloperCommand(save, 'money add 500');

    expect(result.message).toBe('Money set to $535.');
    expect(getLevelSave(result.save, 'river').money).toBe(535);
  });
});

describe('level data', () => {
  it('defines the requested level order', () => {
    expect(levels.map((level) => level.id)).toEqual(['river', 'lake', 'estuary', 'coral-reef']);
  });

  it('defines each required fish pool', () => {
    expect(levels[0].fishPool).toEqual(['minnow', 'bluegill', 'largemouth-bass', 'smallmouth-bass', 'rainbow-trout', 'sockeye-salmon', 'atlantic-sturgeon', 'channel-catfish']);
    expect(levels[1].fishPool).toEqual(['bluegill', 'largemouth-bass', 'smallmouth-bass', 'black-crappie', 'northern-pike', 'walleye', 'blue-catfish']);
    expect(levels[2].fishPool).toEqual(['gray-mullet', 'striped-bass', 'yellowtail-flounder', 'red-drum', 'black-drum', 'tarpon', 'bull-shark', 'sandbar-shark']);
    expect(levels[3].fishPool).toEqual(['damselfish', 'butterflyfish', 'rainbow-parrotfish', 'clown-triggerfish', 'red-lionfish', 'goliath-grouper', 'great-barracuda', 'mahi-mahi', 'blacktip-reef-shark', 'hammerhead-shark']);
  });

  it('has species and assets for every configured fish id', () => {
    const speciesIds = new Set(fishSpecies.map((fish) => fish.id));
    const assetIds = new Set(assetManifest.map((asset) => asset.id));
    for (const level of levels) {
      for (const fishId of level.fishPool) {
        expect(speciesIds.has(fishId)).toBe(true);
        expect(assetIds.has(`fish-${fishId}`)).toBe(true);
      }
    }
  });

  it('registers reusable random texture variants for folder-backed fish', () => {
    expect(getAssetTextureIds('fish-damselfish')).toHaveLength(6);
    expect(getAssetTextureIds('fish-butterflyfish')).toHaveLength(7);
    expect(chooseAssetTextureId('fish-damselfish', () => 0)).toBe('fish-damselfish');
    expect(chooseAssetTextureId('fish-damselfish', () => 0.999)).toBe('fish-damselfish-royal-damselfish');
  });
});
