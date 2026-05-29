export type FishDebugState = 'swimming' | 'hooked';

export interface FishDebugSnapshot {
  uid: string;
  state: FishDebugState;
  speciesId: string;
  displayName: string;
  weightLb: number;
  x: number;
  y: number;
  depthRatio: number;
  velocityX?: number;
  velocityY?: number;
  speed?: number;
  schoolId?: number;
  pullSpeed?: number;
  pullAngle?: number;
  pullTurnSpeed?: number;
}

export const fishDebugUidForIndex = (index: number): string => {
  const alphabetSize = 26;
  const group = Math.floor(index / 100);
  const number = index % 100;
  let letters = '';
  let letterValue = group;

  do {
    letters = String.fromCharCode(65 + (letterValue % alphabetSize)) + letters;
    letterValue = Math.floor(letterValue / alphabetSize) - 1;
  } while (letterValue >= 0);

  return `${letters}${number.toString().padStart(2, '0')}`;
};

const formatNumber = (value: number, digits = 2) => value.toFixed(digits);

export const formatFishDebugSummary = (fish: FishDebugSnapshot[]): string => {
  const swimmingCount = fish.filter((entry) => entry.state === 'swimming').length;
  const hookedCount = fish.length - swimmingCount;
  const totalWeight = fish.reduce((total, entry) => total + entry.weightLb, 0);
  const speciesTotals = new Map<string, { count: number; weightLb: number }>();

  for (const entry of fish) {
    const current = speciesTotals.get(entry.displayName) ?? { count: 0, weightLb: 0 };
    speciesTotals.set(entry.displayName, {
      count: current.count + 1,
      weightLb: current.weightLb + entry.weightLb,
    });
  }

  const speciesText = [...speciesTotals.entries()]
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([displayName, total]) => `${displayName} x${total.count} ${formatNumber(total.weightLb)} lb`)
    .join('; ');

  return `Fish: total ${fish.length}, swimming ${swimmingCount}, hooked ${hookedCount}, total weight ${formatNumber(totalWeight)} lb, species ${speciesTotals.size}${speciesText ? ` | ${speciesText}` : ''}.`;
};

export const formatFishDebugDetail = (fish: FishDebugSnapshot): string => {
  const common = `${fish.uid} ${fish.state} ${fish.displayName} (${fish.speciesId}): ${formatNumber(fish.weightLb)} lb, x=${Math.round(fish.x)}, y=${Math.round(fish.y)}, depth=${formatNumber(fish.depthRatio)}`;
  if (fish.state === 'hooked') {
    return `${common}, pullSpeed=${formatNumber(fish.pullSpeed ?? 0)}, pullAngle=${formatNumber(fish.pullAngle ?? 0)}, pullTurn=${formatNumber(fish.pullTurnSpeed ?? 0)}.`;
  }

  const schoolText = fish.schoolId ? `, school=${fish.schoolId}` : '';
  return `${common}, speed=${formatNumber(fish.speed ?? 0)}, velocity=(${formatNumber(fish.velocityX ?? 0)},${formatNumber(fish.velocityY ?? 0)})${schoolText}.`;
};

export const formatFishDebugLookup = (fish: FishDebugSnapshot[], uid: string): string => {
  const normalizedUid = uid.toUpperCase();
  const match = fish.find((entry) => entry.uid.toUpperCase() === normalizedUid);
  return match ? formatFishDebugDetail(match) : `No active fish with UID ${normalizedUid}.`;
};
