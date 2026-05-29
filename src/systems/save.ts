import type { LevelId, PlayerLevelSave, PlayerSave } from '../types';

export const SAVE_KEY = 'fishing-game-save-v1';

const levelStarterLoadouts: Record<LevelId, Pick<PlayerLevelSave, 'ownedRodIds' | 'ownedLureIds' | 'ownedBoatIds' | 'equippedRodId' | 'equippedLureId' | 'equippedBaitId' | 'equippedBoatId'>> = {
  river: {
    ownedRodIds: ['twig-rod'],
    ownedLureIds: ['starter-bobber'],
    ownedBoatIds: ['dock'],
    equippedRodId: 'twig-rod',
    equippedLureId: 'starter-bobber',
    equippedBaitId: 'red-worms',
    equippedBoatId: 'dock',
  },
  lake: {
    ownedRodIds: ['bamboo-rod'],
    ownedLureIds: ['silver-spoon'],
    ownedBoatIds: ['rowboat'],
    equippedRodId: 'bamboo-rod',
    equippedLureId: 'silver-spoon',
    equippedBaitId: 'red-worms',
    equippedBoatId: 'rowboat',
  },
  estuary: {
    ownedRodIds: ['surf-rod'],
    ownedLureIds: ['surf-jig'],
    ownedBoatIds: ['bass-boat'],
    equippedRodId: 'surf-rod',
    equippedLureId: 'surf-jig',
    equippedBaitId: 'live-minnows',
    equippedBoatId: 'bass-boat',
  },
  'coral-reef': {
    ownedRodIds: ['reef-rod'],
    ownedLureIds: ['reef-spinner'],
    ownedBoatIds: ['bay-skiff'],
    equippedRodId: 'reef-rod',
    equippedLureId: 'reef-spinner',
    equippedBaitId: 'shrimp',
    equippedBoatId: 'bay-skiff',
  },
  'open-ocean': {
    ownedRodIds: ['offshore-rod'],
    ownedLureIds: ['bluewater-troll'],
    ownedBoatIds: ['reef-runner'],
    equippedRodId: 'offshore-rod',
    equippedLureId: 'bluewater-troll',
    equippedBaitId: 'squid-strips',
    equippedBoatId: 'reef-runner',
  },
};

export const defaultLevelSave = (levelId: LevelId = 'river'): PlayerLevelSave => ({
  money: 35,
  ...levelStarterLoadouts[levelId],
  ownedCrabPotIds: [],
  baitInventory: {},
  activeAttractorKind: 'lure',
  activeChumId: undefined,
  chumExpiresAt: undefined,
  catchLog: {},
  crabCatchLog: undefined,
});

export const defaultSave = (): PlayerSave => ({
  version: 2,
  currentLevelId: 'river',
  unlockedLevelIds: ['river'],
  levels: {
    river: defaultLevelSave('river'),
  },
});

const normalizeLevelSave = (value: unknown, levelId: LevelId): PlayerLevelSave => {
  const fallback = defaultLevelSave(levelId);
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const partial = value as Partial<PlayerLevelSave>;
  return {
    money: typeof partial.money === 'number' ? partial.money : fallback.money,
    ownedRodIds: partial.ownedRodIds?.length ? partial.ownedRodIds : fallback.ownedRodIds,
    ownedLureIds: partial.ownedLureIds?.length ? partial.ownedLureIds : fallback.ownedLureIds,
    ownedBoatIds: partial.ownedBoatIds?.length ? partial.ownedBoatIds : fallback.ownedBoatIds,
    ownedCrabPotIds: partial.ownedCrabPotIds ?? fallback.ownedCrabPotIds,
    baitInventory: partial.baitInventory ?? fallback.baitInventory,
    equippedRodId: partial.equippedRodId ?? fallback.equippedRodId,
    equippedLureId: partial.equippedLureId ?? fallback.equippedLureId,
    equippedBaitId: partial.equippedBaitId ?? fallback.equippedBaitId,
    equippedBoatId: partial.equippedBoatId ?? fallback.equippedBoatId,
    activeAttractorKind: partial.activeAttractorKind ?? fallback.activeAttractorKind,
    activeChumId: partial.activeChumId,
    chumExpiresAt: partial.chumExpiresAt,
    catchLog: partial.catchLog ?? fallback.catchLog,
    crabCatchLog: partial.crabCatchLog,
  };
};

const isLevelId = (value: unknown): value is LevelId =>
  value === 'river' || value === 'lake' || value === 'estuary' || value === 'coral-reef' || value === 'open-ocean';

const migrateLegacySave = (legacy: Partial<PlayerLevelSave>): PlayerSave => ({
  version: 2,
  currentLevelId: 'lake',
  unlockedLevelIds: ['river', 'lake'],
  levels: {
    river: defaultLevelSave('river'),
    lake: normalizeLevelSave(legacy, 'lake'),
  },
});

export const normalizeSave = (value: unknown): PlayerSave => {
  const fallback = defaultSave();
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const partial = value as Partial<PlayerSave> & Partial<PlayerLevelSave>;
  if (partial.version !== 2 || !partial.levels) {
    return migrateLegacySave(partial);
  }

  const unlockedLevelIds = (partial.unlockedLevelIds ?? fallback.unlockedLevelIds).filter(isLevelId);
  const safeUnlockedLevelIds = unlockedLevelIds.length ? unlockedLevelIds : fallback.unlockedLevelIds;
  const currentLevelId = isLevelId(partial.currentLevelId) && safeUnlockedLevelIds.includes(partial.currentLevelId)
    ? partial.currentLevelId
    : safeUnlockedLevelIds[0];

  const levels: Partial<Record<LevelId, PlayerLevelSave>> = {};
  for (const levelId of safeUnlockedLevelIds) {
    levels[levelId] = normalizeLevelSave(partial.levels[levelId], levelId);
  }

  return {
    version: 2,
    currentLevelId,
    unlockedLevelIds: safeUnlockedLevelIds,
    levels,
  };
};

export const getLevelSave = (save: PlayerSave, levelId = save.currentLevelId): PlayerLevelSave =>
  save.levels[levelId] ?? defaultLevelSave(levelId);

export class SaveStore {
  private current: PlayerSave;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = globalThis.localStorage ?? null) {
    this.current = this.read();
  }

  get(): PlayerSave {
    return this.current;
  }

  getCurrentLevelSave(): PlayerLevelSave {
    return getLevelSave(this.current);
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

  setCurrentLevel(levelId: LevelId): PlayerSave {
    if (!this.current.unlockedLevelIds.includes(levelId)) {
      return this.current;
    }
    return this.set({ ...this.current, currentLevelId: levelId });
  }

  setCurrentLevelSave(levelSave: PlayerLevelSave): PlayerSave {
    const levelId = this.current.currentLevelId;
    return this.set({
      ...this.current,
      levels: {
        ...this.current.levels,
        [levelId]: levelSave,
      },
    });
  }

  unlockLevel(levelId: LevelId): PlayerSave {
    if (this.current.unlockedLevelIds.includes(levelId)) {
      return this.setCurrentLevel(levelId);
    }
    return this.set({
      ...this.current,
      currentLevelId: levelId,
      unlockedLevelIds: [...this.current.unlockedLevelIds, levelId],
      levels: {
        ...this.current.levels,
        [levelId]: defaultLevelSave(levelId),
      },
    });
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
