import type { FishSpecies } from '../types';

const minVisualLengthInches = 3;
const minBaseDisplayWidth = 18;
const referenceVisualLengthInches = 120;
const referenceBaseDisplayWidth = 240;
const minSchoolSeparationRadius = 28;
const maxSchoolSeparationRadius = 36;
const minSchoolCohesionStrength = 0.24;
const maxSchoolCohesionStrength = 0.38;
const minSchoolSeparationStrength = 58;
const maxSchoolSeparationStrength = 90;
const minWeightVisualMultiplier = 0.82;
const maxWeightVisualMultiplier = 1.28;
const compactFishAspectRatioThreshold = 2.2;
const compactFishAreaHeightRatio = 0.58;
const weightVisualInfluence = 0.45;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizedVisualLength = (visualLengthInches: number) => {
  const length = Math.max(minVisualLengthInches, visualLengthInches);
  return (Math.sqrt(length) - Math.sqrt(minVisualLengthInches)) / (Math.sqrt(referenceVisualLengthInches) - Math.sqrt(minVisualLengthInches));
};

const cappedNormalizedVisualLength = (visualLengthInches: number) =>
  clamp(normalizedVisualLength(visualLengthInches), 0, 1);

const normalizedWeightRatio = (species: FishSpecies, weightLb: number) => {
  const weightRange = species.trophyWeightLb - species.minimumWeightLb;
  if (weightRange <= 0) {
    return 0;
  }

  return clamp((weightLb - species.minimumWeightLb) / weightRange, 0, 1);
};

export const fishBaseDisplayWidth = (species: FishSpecies): number => {
  const normalized = normalizedVisualLength(species.visualLengthInches);
  return minBaseDisplayWidth + normalized * (referenceBaseDisplayWidth - minBaseDisplayWidth);
};

export const fishWeightVisualMultiplier = (species: FishSpecies, weightLb: number): number => {
  const weightRatio = normalizedWeightRatio(species, weightLb);
  const averageRatio = normalizedWeightRatio(species, species.averageWeightLb);
  const multiplier = 1 + (Math.sqrt(weightRatio) - Math.sqrt(averageRatio)) * weightVisualInfluence;

  return clamp(multiplier, minWeightVisualMultiplier, maxWeightVisualMultiplier);
};

export const fishDisplayWidth = (species: FishSpecies, weightLb: number): number =>
  fishBaseDisplayWidth(species) * fishWeightVisualMultiplier(species, weightLb);

export const fishDisplaySize = (species: FishSpecies, weightLb: number, textureAspectRatio: number): { width: number; height: number } => {
  const targetWidth = fishDisplayWidth(species, weightLb);
  const aspectRatio = Math.max(0.1, textureAspectRatio);

  if (aspectRatio > compactFishAspectRatioThreshold) {
    return {
      width: targetWidth,
      height: targetWidth / aspectRatio,
    };
  }

  const targetArea = targetWidth * targetWidth * compactFishAreaHeightRatio;
  return {
    width: Math.sqrt(targetArea * aspectRatio),
    height: Math.sqrt(targetArea / aspectRatio),
  };
};

export const fishSchoolSeparationRadius = (species: FishSpecies): number => {
  const normalized = cappedNormalizedVisualLength(species.visualLengthInches);
  return maxSchoolSeparationRadius - normalized * (maxSchoolSeparationRadius - minSchoolSeparationRadius);
};

export const fishSchoolCohesionStrength = (species: FishSpecies): number => {
  const normalized = cappedNormalizedVisualLength(species.visualLengthInches);
  return maxSchoolCohesionStrength - normalized * (maxSchoolCohesionStrength - minSchoolCohesionStrength);
};

export const fishSchoolSeparationStrength = (species: FishSpecies): number => {
  const normalized = cappedNormalizedVisualLength(species.visualLengthInches);
  return minSchoolSeparationStrength + normalized * (maxSchoolSeparationStrength - minSchoolSeparationStrength);
};
