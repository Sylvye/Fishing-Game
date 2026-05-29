export const oceanCurrentVelocity = (
  depthRatio: number,
  currents?: { surfacePush: number; deepPush: number },
): number => {
  if (!currents) {
    return 0;
  }

  const depth = Math.min(1, Math.max(0, depthRatio));
  if (depth < 0.5) {
    return currents.surfacePush * (1 - depth / 0.5);
  }

  return currents.deepPush * ((depth - 0.5) / 0.5);
};
