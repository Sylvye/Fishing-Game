import { fishById, fishSpecies } from '../data/fish';
import { getLevelSave } from './save';
import type { PlayerSave } from '../types';

export interface DeveloperCommandResult {
  save: PlayerSave;
  message: string;
}

export interface FishDeveloperCommand {
  action: 'hook' | 'spawn';
  speciesId: string;
  weightLb?: number;
  count?: number;
}

export type FishDeveloperCommandParseResult =
  | { kind: 'not-fish' }
  | { kind: 'error'; message: string }
  | { kind: 'command'; command: FishDeveloperCommand };

const developerCommandHelp = 'Try: money add 500, fish spawn bluegill, fish hook bluegill weight=2 count=3';

const normalizeCommand = (command: string) => command.trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeSpeciesInput = (input: string) => input.replace(/[\s_]+/g, '-');

export const findDeveloperFishSpeciesId = (input: string): string | undefined => {
  const normalized = normalizeSpeciesInput(input.toLowerCase());
  if (fishById.has(normalized)) {
    return normalized;
  }

  return fishSpecies.find((species) => normalizeSpeciesInput(species.displayName.toLowerCase()) === normalized)?.id;
};

export const parseFishDeveloperCommand = (command: string): FishDeveloperCommandParseResult => {
  const normalized = normalizeCommand(command);
  if (!normalized.startsWith('fish ')) {
    return { kind: 'not-fish' };
  }

  const tokens = normalized.split(' ');
  const action = tokens[1];
  if (action !== 'hook' && action !== 'spawn') {
    return { kind: 'error', message: 'Fish command must be: fish hook TYPE [weight=x] [count=x] or fish spawn TYPE [weight=x] [count=x].' };
  }

  const speciesParts: string[] = [];
  let weightLb: number | undefined;
  let count: number | undefined;

  for (const token of tokens.slice(2)) {
    if (token.startsWith('weight=')) {
      const value = Number(token.slice('weight='.length));
      if (!Number.isFinite(value) || value <= 0) {
        return { kind: 'error', message: 'Fish weight must be a positive number.' };
      }
      weightLb = value;
    } else if (token.startsWith('count=')) {
      const value = Number(token.slice('count='.length));
      if (!Number.isSafeInteger(value) || value <= 0) {
        return { kind: 'error', message: 'Fish count must be a positive whole number.' };
      }
      count = value;
    } else if (token.includes('=')) {
      return { kind: 'error', message: 'Fish command options must use weight=x or count=x.' };
    } else {
      speciesParts.push(token);
    }
  }

  if (speciesParts.length === 0) {
    return { kind: 'error', message: 'Fish command needs a fish type.' };
  }

  const speciesId = findDeveloperFishSpeciesId(speciesParts.join('-'));
  if (!speciesId) {
    return { kind: 'error', message: `Unknown fish type: ${speciesParts.join(' ')}.` };
  }

  return { kind: 'command', command: { action, speciesId, weightLb, count } };
};

export const applyDeveloperCommand = (save: PlayerSave, command: string): DeveloperCommandResult => {
  const normalized = normalizeCommand(command);
  const moneyMatch = /^money add (-?\d+)$/.exec(normalized);
  if (!moneyMatch) {
    return { save, message: `Unknown command. ${developerCommandHelp}` };
  }

  const amount = Number(moneyMatch[1]);
  if (!Number.isSafeInteger(amount)) {
    return { save, message: 'Money amount must be a whole number.' };
  }

  const levelSave = getLevelSave(save);
  const nextMoney = Math.max(0, levelSave.money + amount);
  return {
    save: {
      ...save,
      levels: {
        ...save.levels,
        [save.currentLevelId]: {
          ...levelSave,
          money: nextMoney,
        },
      },
    },
    message: `Money set to $${nextMoney}.`,
  };
};
