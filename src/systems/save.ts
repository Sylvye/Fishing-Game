import type { PlayerSave } from '../types';

export const SAVE_KEY = 'fishing-game-save-v1';

export const defaultSave = (): PlayerSave => ({
  version: 1,
  money: 35,
  ownedRodIds: ['twig-rod'],
  ownedLureIds: ['starter-bobber'],
  ownedBoatIds: ['dock'],
  baitInventory: {},
  equippedRodId: 'twig-rod',
  equippedLureId: 'starter-bobber',
  equippedBaitId: 'red-worms',
  equippedBoatId: 'dock',
  activeAttractorKind: 'lure',
  activeChumId: undefined,
  chumExpiresAt: undefined,
  unlockedLevelIds: ['lake'],
  catchLog: {},
});

export const normalizeSave = (value: unknown): PlayerSave => {
  const fallback = defaultSave();
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const partial = value as Partial<PlayerSave>;
  return {
    version: 1,
    money: typeof partial.money === 'number' ? partial.money : fallback.money,
    ownedRodIds: partial.ownedRodIds?.length ? partial.ownedRodIds : fallback.ownedRodIds,
    ownedLureIds: partial.ownedLureIds?.length ? partial.ownedLureIds : fallback.ownedLureIds,
    ownedBoatIds: partial.ownedBoatIds?.length ? partial.ownedBoatIds : fallback.ownedBoatIds,
    baitInventory: partial.baitInventory ?? fallback.baitInventory,
    equippedRodId: partial.equippedRodId ?? fallback.equippedRodId,
    equippedLureId: partial.equippedLureId ?? fallback.equippedLureId,
    equippedBaitId: partial.equippedBaitId ?? fallback.equippedBaitId,
    equippedBoatId: partial.equippedBoatId ?? fallback.equippedBoatId,
    activeAttractorKind: partial.activeAttractorKind ?? fallback.activeAttractorKind,
    activeChumId: partial.activeChumId,
    chumExpiresAt: partial.chumExpiresAt,
    unlockedLevelIds: partial.unlockedLevelIds?.length ? partial.unlockedLevelIds : fallback.unlockedLevelIds,
    catchLog: partial.catchLog ?? fallback.catchLog,
  };
};

export class SaveStore {
  private current: PlayerSave;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = globalThis.localStorage ?? null) {
    this.current = this.read();
  }

  get(): PlayerSave {
    return this.current;
  }

  reload(): PlayerSave {
    this.current = this.read();
    return this.current;
  }

  set(save: PlayerSave): PlayerSave {
    this.current = normalizeSave(save);
    this.persist();
    return this.current;
  }

  reset(): PlayerSave {
    this.current = defaultSave();
    this.storage?.removeItem(SAVE_KEY);
    this.persist();
    return this.current;
  }

  private read(): PlayerSave {
    if (!this.storage) {
      return defaultSave();
    }
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      return raw ? normalizeSave(JSON.parse(raw)) : defaultSave();
    } catch {
      return defaultSave();
    }
  }

  private persist() {
    this.storage?.setItem(SAVE_KEY, JSON.stringify(this.current));
  }
}
