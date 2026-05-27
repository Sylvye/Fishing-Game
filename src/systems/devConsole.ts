import { getLevelSave } from './save';
import type { PlayerSave } from '../types';

export interface DeveloperCommandResult {
  save: PlayerSave;
  message: string;
}

export const applyDeveloperCommand = (save: PlayerSave, command: string): DeveloperCommandResult => {
  const normalized = command.trim().replace(/\s+/g, ' ').toLowerCase();
  const moneyMatch = /^money add (-?\d+)$/.exec(normalized);
  if (!moneyMatch) {
    return { save, message: 'Unknown command. Try: money add 500' };
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
