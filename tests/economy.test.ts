import { describe, expect, it } from 'vitest';
import { fishSpecies } from '../src/data/fish';
import { applySaleMultiplier, buyOrEquipItem, createCaughtFish, fishValue, randomFishWeight, recordCatch } from '../src/systems/economy';
import { defaultSave, normalizeSave, SAVE_KEY, SaveStore } from '../src/systems/save';

describe('fish economy', () => {
  it('generates weights inside species ranges', () => {
    for (const species of fishSpecies) {
      const weights = [0, 0.2, 0.55, 0.91, 0.999].map((roll) => randomFishWeight(species, () => roll));
      for (const weight of weights) {
        expect(weight).toBeGreaterThanOrEqual(species.weightRangeLb[0]);
        expect(weight).toBeLessThanOrEqual(species.weightRangeLb[1]);
      }
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

  it('records sold catches into money and catch log', () => {
    const save = defaultSave();
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
    const save = { ...defaultSave(), money: 150 };
    const updated = buyOrEquipItem(save, 'rod', 'bamboo-rod');
    expect(updated.money).toBe(30);
    expect(updated.ownedRodIds).toContain('bamboo-rod');
    expect(updated.equippedRodId).toBe('bamboo-rod');
  });

  it('normalizes missing save fields with defaults', () => {
    const normalized = normalizeSave({ money: 99, ownedRodIds: ['twig-rod'] });
    expect(normalized.money).toBe(99);
    expect(normalized.equippedLureId).toBe('starter-bobber');
    expect(normalized.unlockedLevelIds).toEqual(['lake']);
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

    lakeStore.set({ ...defaultSave(), money: 150 });

    expect(JSON.parse(memory.get(SAVE_KEY) ?? '{}').money).toBe(150);
    expect(shopStore.get().money).toBe(35);
    expect(shopStore.reload().money).toBe(150);
  });
});
