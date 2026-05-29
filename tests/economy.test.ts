import { describe, expect, it } from 'vitest';
import { assetManifest, chooseAssetTextureId, getAssetTextureIds } from '../src/data/assets';
import { fishSpecies } from '../src/data/fish';
import { levels } from '../src/data/levels';
import { baitById, lureById } from '../src/data/items';
import { applyDeveloperCommand, parseFishDeveloperCommand, parseSceneDeveloperCommand } from '../src/systems/devConsole';
import {
  applySaleMultiplier,
  attractionChanceForFish,
  buyFerryTicket,
  buyOrEquipItem,
  canBuyFerryTicket,
  consumeBaitUse,
  createCaughtFish,
  effectiveLineLoadRatio,
  fishValue,
  getShopItems,
  lineStressGainPerSecond,
  randomFishWeight,
  recordCatch,
  soloStressMultiplierForHookedFish,
} from '../src/systems/economy';
import { fishDebugUidForIndex, formatFishDebugLookup, formatFishDebugSummary, type FishDebugSnapshot } from '../src/systems/fishDebug';
import {
  fishDisplaySize,
  fishDisplayWidth,
  fishSchoolCohesionStrength,
  fishSchoolSeparationRadius,
  fishSchoolSeparationStrength,
  fishWeightVisualMultiplier,
} from '../src/systems/fishSizing';
import { oceanCurrentVelocity } from '../src/systems/oceanCurrents';
import { defaultLevelSave, defaultSave, getLevelSave, normalizeSave, SAVE_KEY, SaveStore } from '../src/systems/save';

describe('fish economy', () => {
  const speciesById = (id: string) => fishSpecies.find((species) => species.id === id)!;

  it('generates gaussian weights inside species bounds', () => {
    for (const species of fishSpecies) {
      const weights = [0, 0.2, 0.55, 0.91, 0.999].map((roll) => randomFishWeight(species, () => roll));
      for (const weight of weights) {
        expect(weight).toBeGreaterThanOrEqual(species.minimumWeightLb);
        expect(weight).toBeLessThanOrEqual(species.trophyWeightLb);
      }
    }
  });

  it('sizes fish by curated species length at average weight', () => {
    const minnow = speciesById('minnow');
    const bluegill = speciesById('bluegill');
    const bass = speciesById('largemouth-bass');
    const barracuda = speciesById('great-barracuda');
    const tarpon = speciesById('tarpon');
    const bullShark = speciesById('bull-shark');
    const hammerhead = speciesById('hammerhead-shark');

    expect(fishDisplayWidth(minnow, minnow.averageWeightLb)).toBeLessThan(fishDisplayWidth(bluegill, bluegill.averageWeightLb) * 0.65);
    expect(fishDisplayWidth(bluegill, bluegill.averageWeightLb)).toBeLessThan(fishDisplayWidth(bass, bass.averageWeightLb));
    expect(fishDisplayWidth(barracuda, barracuda.averageWeightLb)).toBeGreaterThan(fishDisplayWidth(bass, bass.averageWeightLb) * 1.7);
    expect(fishDisplayWidth(tarpon, tarpon.averageWeightLb)).toBeGreaterThan(fishDisplayWidth(bass, bass.averageWeightLb) * 1.9);
    expect(fishDisplayWidth(bullShark, bullShark.averageWeightLb)).toBeGreaterThan(fishDisplayWidth(bass, bass.averageWeightLb) * 2.1);
    expect(fishDisplayWidth(hammerhead, hammerhead.averageWeightLb)).toBeGreaterThan(fishDisplayWidth(bullShark, bullShark.averageWeightLb));
  });

  it('allows giant fish to exceed the old trophy display cap', () => {
    const hammerhead = speciesById('hammerhead-shark');
    const whaleShark = speciesById('whale-shark');

    expect(fishDisplayWidth(whaleShark, whaleShark.averageWeightLb)).toBeGreaterThan(fishDisplayWidth(hammerhead, hammerhead.averageWeightLb) * 1.8);
    expect(fishDisplayWidth(whaleShark, whaleShark.averageWeightLb)).toBeGreaterThan(420);
  });

  it('scales individual fish moderately by weight', () => {
    const bass = speciesById('largemouth-bass');
    const minimumWidth = fishDisplayWidth(bass, bass.minimumWeightLb);
    const averageWidth = fishDisplayWidth(bass, bass.averageWeightLb);
    const trophyWidth = fishDisplayWidth(bass, bass.trophyWeightLb);

    expect(minimumWidth).toBeLessThan(averageWidth);
    expect(trophyWidth).toBeGreaterThan(averageWidth);
    expect(trophyWidth).toBeLessThan(averageWidth * 1.3);
  });

  it('keeps compact fish variants visually similar across source aspect ratios', () => {
    const butterflyfish = speciesById('butterflyfish');
    const compactVariant = fishDisplaySize(butterflyfish, butterflyfish.averageWeightLb, 436 / 409);
    const longerVariant = fishDisplaySize(butterflyfish, butterflyfish.averageWeightLb, 694 / 389);
    const compactArea = compactVariant.width * compactVariant.height;
    const longerArea = longerVariant.width * longerVariant.height;

    expect(compactArea).toBeCloseTo(longerArea);
  });

  it('keeps elongated fish length based on species size', () => {
    const barracuda = speciesById('great-barracuda');
    const displayWidth = fishDisplayWidth(barracuda, barracuda.averageWeightLb);

    expect(fishDisplaySize(barracuda, barracuda.averageWeightLb, 1531 / 367).width).toBeCloseTo(displayWidth);
  });

  it('keeps fish weight visual multipliers capped', () => {
    for (const species of fishSpecies) {
      expect(fishWeightVisualMultiplier(species, species.minimumWeightLb)).toBeGreaterThanOrEqual(0.82);
      expect(fishWeightVisualMultiplier(species, species.trophyWeightLb)).toBeLessThanOrEqual(1.28);
    }
  });

  it('balances schooling separation and cohesion by species size', () => {
    const minnow = speciesById('minnow');
    const bluegill = speciesById('bluegill');
    const bass = speciesById('largemouth-bass');
    const hammerhead = speciesById('hammerhead-shark');

    expect(fishSchoolSeparationRadius(minnow)).toBeGreaterThan(fishSchoolSeparationRadius(bluegill));
    expect(fishSchoolSeparationRadius(minnow)).toBeLessThan(42);
    expect(fishSchoolSeparationRadius(bluegill)).toBeGreaterThan(fishSchoolSeparationRadius(bass));
    expect(fishSchoolSeparationRadius(bass)).toBeGreaterThan(fishSchoolSeparationRadius(hammerhead));
    expect(fishSchoolCohesionStrength(minnow)).toBeGreaterThan(fishSchoolCohesionStrength(hammerhead));
    expect(fishSchoolSeparationStrength(minnow)).toBeLessThan(fishSchoolSeparationStrength(hammerhead));
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

  it('defines behavior tags for predator pressure and strong fighters', () => {
    const behaviorTagsById = new Map(fishSpecies.map((fish) => [fish.id, fish.behaviorTags]));

    expect(behaviorTagsById.get('northern-pike')).toContain('fearsome');
    expect(behaviorTagsById.get('bull-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('sandbar-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('blacktip-reef-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('hammerhead-shark')).toContain('fearsome');
    expect(behaviorTagsById.get('great-barracuda')).toContain('fearsome');
    expect(behaviorTagsById.get('goliath-grouper')).toContain('stoic');
    expect(behaviorTagsById.get('red-lionfish')).toContain('stoic');
    expect(behaviorTagsById.get('bull-shark')).toContain('strong');
    expect(behaviorTagsById.get('sandbar-shark')).toContain('strong');
    expect(behaviorTagsById.get('blacktip-reef-shark')).toContain('strong');
    expect(behaviorTagsById.get('hammerhead-shark')).toContain('strong');
    expect(behaviorTagsById.get('mahi-mahi')).toContain('strong');
    expect(behaviorTagsById.get('tarpon')).toContain('strong');
  });

  it('calculates line stress from weight, solo lures, and multiple fish', () => {
    const starter = lureById.get('starter-bobber')!;
    const sharkPlug = lureById.get('shark-plug')!;
    const bluewater = lureById.get('bluewater-troll')!;

    expect(lineStressGainPerSecond([{ weightLb: 96 }], 96, starter)).toBeCloseTo(0.125);
    expect(lineStressGainPerSecond([{ weightLb: 96 }], 96, sharkPlug)).toBeCloseTo(0.0625);
    expect(lineStressGainPerSecond([{ weightLb: 130 }], 130, bluewater)).toBeCloseTo(0.0625);
    expect(effectiveLineLoadRatio([{ weightLb: 48 }, { weightLb: 48 }], 96, sharkPlug)).toBeCloseTo(1.12);
    expect(lineStressGainPerSecond([{ weightLb: 48 }, { weightLb: 48 }], 96, sharkPlug)).toBeCloseTo(0.14);
    expect(effectiveLineLoadRatio([{ weightLb: 97 }], 96, starter)).toBeGreaterThan(1);
    expect(lineStressGainPerSecond([{ weightLb: 97 }], 96, starter)).toBeCloseTo((97 / 96) / 8);
  });

  it('applies solo stress multiplier only while one fish is hooked', () => {
    const sharkPlug = lureById.get('shark-plug')!;

    expect(soloStressMultiplierForHookedFish([{ weightLb: 96 }], sharkPlug)).toBe(0.5);
    expect(soloStressMultiplierForHookedFish([{ weightLb: 48 }, { weightLb: 48 }], sharkPlug)).toBe(1);
    expect(soloStressMultiplierForHookedFish([{ weightLb: 96 }])).toBe(1);
  });

  it('formats aggregate fish debug info', () => {
    const fish: FishDebugSnapshot[] = [
      { uid: 'F1', state: 'swimming', speciesId: 'bluegill', displayName: 'Bluegill', weightLb: 1.25, x: 10, y: 20, depthRatio: 0.2 },
      { uid: 'F2', state: 'swimming', speciesId: 'bluegill', displayName: 'Bluegill', weightLb: 0.75, x: 18, y: 28, depthRatio: 0.25 },
      { uid: 'F3', state: 'hooked', speciesId: 'largemouth-bass', displayName: 'Largemouth Bass', weightLb: 5, x: 40, y: 50, depthRatio: 0.45 },
    ];

    expect(formatFishDebugSummary(fish)).toBe('Fish: total 3, swimming 2, hooked 1, total weight 7.00 lb, species 2 | Bluegill x2 2.00 lb; Largemouth Bass x1 5.00 lb.');
  });

  it('formats fish debug lookup details and missing UID output', () => {
    const fish: FishDebugSnapshot[] = [
      { uid: 'A12', state: 'swimming', speciesId: 'bluegill', displayName: 'Bluegill', weightLb: 1.25, x: 10, y: 20, depthRatio: 0.2, velocityX: 3, velocityY: 4, speed: 5, schoolId: 7 },
      { uid: 'A13', state: 'hooked', speciesId: 'largemouth-bass', displayName: 'Largemouth Bass', weightLb: 5, x: 40, y: 50, depthRatio: 0.45, pullSpeed: 12, pullAngle: 1.2, pullTurnSpeed: 3.4 },
    ];

    expect(formatFishDebugLookup(fish, 'a12')).toBe('A12 swimming Bluegill (bluegill): 1.25 lb, x=10, y=20, depth=0.20, speed=5.00, velocity=(3.00,4.00), school=7.');
    expect(formatFishDebugLookup(fish, 'A13')).toBe('A13 hooked Largemouth Bass (largemouth-bass): 5.00 lb, x=40, y=50, depth=0.45, pullSpeed=12.00, pullAngle=1.20, pullTurn=3.40.');
    expect(formatFishDebugLookup(fish, 'AA00')).toBe('No active fish with UID AA00.');
  });

  it('generates compact alphabetic fish debug UIDs', () => {
    expect(fishDebugUidForIndex(0)).toBe('A00');
    expect(fishDebugUidForIndex(99)).toBe('A99');
    expect(fishDebugUidForIndex(100)).toBe('B00');
    expect(fishDebugUidForIndex(2599)).toBe('Z99');
    expect(fishDebugUidForIndex(2600)).toBe('AA00');
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

  it('normalizes Open Ocean saves with starter bluewater gear', () => {
    const normalized = normalizeSave({
      version: 2,
      currentLevelId: 'open-ocean',
      unlockedLevelIds: ['river', 'lake', 'estuary', 'coral-reef', 'open-ocean'],
      levels: {
        'open-ocean': {},
      },
    });

    expect(normalized.currentLevelId).toBe('open-ocean');
    expect(getLevelSave(normalized, 'open-ocean').ownedRodIds).toEqual(['offshore-rod']);
    expect(getLevelSave(normalized, 'open-ocean').equippedLureId).toBe('bluewater-troll');
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

  it('applies developer unlock all command to maps and permanent tackle', () => {
    const save = defaultSave();
    const result = applyDeveloperCommand(save, 'unlock all');

    expect(result.message).toBe('Unlocked all maps and permanent tackle.');
    expect(result.save.unlockedLevelIds).toEqual(['river', 'lake', 'estuary', 'coral-reef', 'open-ocean']);
    expect(getLevelSave(result.save, 'river').ownedRodIds).toEqual(['twig-rod', 'bamboo-rod', 'graphite-rod']);
    expect(getLevelSave(result.save, 'lake').ownedLureIds).toEqual(['silver-spoon', 'minnow-crank', 'scented-sinker']);
    expect(getLevelSave(result.save, 'estuary').ownedCrabPotIds).toEqual(['starter-crab-pot', 'wire-crab-pot']);
    expect(getLevelSave(result.save, 'coral-reef').ownedBoatIds).toEqual(['bay-skiff', 'reef-runner']);
    expect(getLevelSave(result.save, 'open-ocean').ownedRodIds).toEqual(['offshore-rod', 'bluewater-rod', 'titan-rod']);
  });

  it('parses developer fish commands', () => {
    expect(parseSceneDeveloperCommand('debug')).toEqual({
      kind: 'command',
      command: { action: 'debug' },
    });
    expect(parseFishDeveloperCommand('fish clear')).toEqual({
      kind: 'command',
      command: { action: 'clear' },
    });
    expect(parseFishDeveloperCommand('fish info')).toEqual({
      kind: 'command',
      command: { action: 'info' },
    });
    expect(parseFishDeveloperCommand('fish info UID=A12')).toEqual({
      kind: 'command',
      command: { action: 'info', uid: 'A12' },
    });
    expect(parseFishDeveloperCommand('fish info weight=2')).toEqual({
      kind: 'error',
      message: 'Fish info command must be: fish info [UID=X].',
    });
    expect(parseFishDeveloperCommand('fish hook largemouth-bass weight=6.5 count=2')).toEqual({
      kind: 'command',
      command: { action: 'hook', speciesId: 'largemouth-bass', weightLb: 6.5, count: 2 },
    });
    expect(parseFishDeveloperCommand('fish spawn Largemouth Bass')).toEqual({
      kind: 'command',
      command: { action: 'spawn', speciesId: 'largemouth-bass', weightLb: undefined, count: undefined },
    });
  });
});

describe('level data', () => {
  it('defines the requested level order', () => {
    expect(levels.map((level) => level.id)).toEqual(['river', 'lake', 'estuary', 'coral-reef', 'open-ocean']);
  });

  it('defines each required fish pool', () => {
    expect(levels[0].fishPool).toEqual(['minnow', 'bluegill', 'largemouth-bass', 'smallmouth-bass', 'rainbow-trout', 'sockeye-salmon', 'atlantic-sturgeon', 'channel-catfish']);
    expect(levels[1].fishPool).toEqual(['bluegill', 'largemouth-bass', 'smallmouth-bass', 'black-crappie', 'northern-pike', 'walleye', 'blue-catfish']);
    expect(levels[2].fishPool).toEqual(['gray-mullet', 'striped-bass', 'yellowtail-flounder', 'red-drum', 'black-drum', 'tarpon', 'bull-shark', 'sandbar-shark']);
    expect(levels[3].fishPool).toEqual(['damselfish', 'butterflyfish', 'rainbow-parrotfish', 'clown-triggerfish', 'red-lionfish', 'goliath-grouper', 'great-barracuda', 'mahi-mahi', 'blacktip-reef-shark', 'hammerhead-shark']);
    expect(levels[4].fishPool).toEqual(['atlantic-mackerel', 'wahoo', 'yellowfin-tuna', 'mahi-mahi', 'giant-trevally', 'blue-marlin', 'shortfin-mako-shark', 'common-thresher-shark', 'whale-shark']);
  });

  it('connects Coral Reef to Open Ocean progression', () => {
    expect(levels[3].nextLevelId).toBe('open-ocean');
    expect(levels[3].ferryTicketPrice).toBe(3200);
    expect(levels[4].mechanic).toBe('bluewater');
    expect(levels[4].feedingFrenzyEvent?.baitSpeciesId).toBe('atlantic-mackerel');
    expect(levels[4].oceanCurrents).toEqual({ surfacePush: -26, deepPush: 34 });
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

  it('pushes surface water west and deep open ocean water east', () => {
    const currents = levels[4].oceanCurrents;

    expect(oceanCurrentVelocity(0, currents)).toBeLessThan(0);
    expect(oceanCurrentVelocity(0.5, currents)).toBe(0);
    expect(oceanCurrentVelocity(1, currents)).toBeGreaterThan(0);
    expect(oceanCurrentVelocity(0.2, undefined)).toBe(0);
  });
});
