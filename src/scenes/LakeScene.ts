import Phaser from 'phaser';
import { fishById } from '../data/fish';
import { baitById, boatById, chumById, crabPotById, lureById, rodById } from '../data/items';
import { firstLevel, levelById } from '../data/levels';
import {
  applySaleMultiplier,
  attractionChanceForFish,
  chooseWeightedFish,
  consumeBaitUse,
  createCaughtFish,
  randomFishWeight,
  recordCrabCatch,
  recordCatch,
} from '../systems/economy';
import { getLevelSave, SaveStore } from '../systems/save';
import type { AttractorKind, AttractorProfile, Bait, Boat, Chum, FishSpecies, LevelConfig, Lure, PlayerLevelSave, PlayerSave, Rod } from '../types';

type HookState = 'idle' | 'charging' | 'cast' | 'sinking' | 'reeling';

const maxActiveFish = 34;
const initialVisibleFishTarget = 24;
const resetHoldDurationSeconds = 3;
const referenceHeight = 720;

interface SwimmingFish {
  sprite: Phaser.GameObjects.Image;
  species: FishSpecies;
  weightLb: number;
  speed: number;
  direction: 1 | -1;
  sway: number;
  escapeVelocityY?: number;
  attractedUntil?: number;
  nextAttractionCheckAt?: number;
}

interface HookedFish {
  sprite: Phaser.GameObjects.Image;
  species: FishSpecies;
  weightLb: number;
}

interface ActiveAttractor {
  kind: AttractorKind;
  item: AttractorProfile & { id: string; displayName: string };
}

interface ReefHazard {
  xRatio: number;
  yRatio: number;
  radius: number;
  graphics: Phaser.GameObjects.Graphics;
}

export class LakeScene extends Phaser.Scene {
  private readonly saveStore = new SaveStore();
  private level: LevelConfig = firstLevel;
  private gameSave!: PlayerSave;
  private save!: PlayerLevelSave;
  private rod!: Rod;
  private lure!: Lure;
  private bait!: Bait;
  private boat!: Boat;
  private activeChum?: Chum;
  private castAttractor?: ActiveAttractor;
  private waterTop = 160;
  private waterBottom = 720;
  private playerX = 92;
  private playerY = 150;
  private hookState: HookState = 'idle';
  private background?: Phaser.GameObjects.Graphics;
  private hook!: Phaser.GameObjects.Arc;
  private line!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private chargeBar!: Phaser.GameObjects.Graphics;
  private boatContainer?: Phaser.GameObjects.Container;
  private boatLabel?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private catchToast?: Phaser.GameObjects.Container;
  private boatFacing: 1 | -1 = 1;
  private resetHoldSeconds = 0;
  private charge = 0;
  private hookX = 92;
  private hookY = 150;
  private hookVelocityX = 0;
  private hookVelocityY = 0;
  private isInputDown = false;
  private fish: SwimmingFish[] = [];
  private hookedFish: HookedFish[] = [];
  private nextSpawnAt = 0;
  private layoutWidth = 0;
  private layoutHeight = 0;
  private gameplayScale = 1;
  private nextSwarmAt = 0;
  private nextRainAt = 0;
  private rainUntil = 0;
  private rainOverlay?: Phaser.GameObjects.Graphics;
  private nextCrabCatchAt = 0;
  private hazards: ReefHazard[] = [];

  constructor() {
    super('Lake');
  }

  create() {
    this.loadSaveAndEquipment();
    this.refreshActiveChum();
    this.recalculateLayout();
    this.drawBackground();
    this.createReefHazards();
    this.createBoat();
    this.createHud();
    this.createHook();
    this.seedVisibleFish();
    this.scheduleSpawn(0);
    this.scheduleLevelEvents();
    this.bindInput();
    this.scale.on('resize', this.handleResize, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
      this.fish = [];
      this.hookedFish = [];
      this.background = undefined;
      this.rainOverlay = undefined;
      this.hazards = [];
      this.boatContainer = undefined;
      this.boatLabel = undefined;
      this.castAttractor = undefined;
      this.activeChum = undefined;
    });
  }

  update(_time: number, deltaMs: number) {
    const delta = deltaMs / 1000;
    this.refreshActiveChum();
    this.updateLevelEvents();
    this.updateCrabPots();
    this.updateBoat(delta);
    this.updateResetHold(delta);
    if (this.time.now >= this.nextSpawnAt && this.fish.length < this.maxFishForCurrentConditions()) {
      this.spawnFish(false);
      this.scheduleSpawn();
    }
    this.updateHook(delta);
    this.checkHazardSnap();
    this.updateFish(delta);
    this.checkCatch();
    this.drawLine();
    this.updateHud();
  }

  private bindInput() {
    this.input.on('pointerdown', () => this.handleInputDown());
    this.input.on('pointerup', () => this.handleInputUp());
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyR = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInputDown());
    this.input.keyboard?.on('keyup-SPACE', () => this.handleInputUp());
    this.input.keyboard?.on('keydown-S', () => this.openOverlayScene('Shop'));
    this.input.keyboard?.on('keydown-I', () => this.openOverlayScene('Index'));
    this.input.keyboard?.on('keydown-M', () => this.openOverlayScene('Map'));
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === '`') {
        this.openOverlayScene('DevConsole');
      }
    });
  }

  private openOverlayScene(sceneKey: 'Shop' | 'Index' | 'Map' | 'DevConsole') {
    if (this.scene.isActive(sceneKey)) {
      return;
    }
    this.isInputDown = false;
    this.scene.pause();
    this.scene.launch(sceneKey);
  }

  private handleResize() {
    if (this.layoutWidth === this.scale.width && this.layoutHeight === this.scale.height) {
      return;
    }
    const previousLayout = {
      waterTop: this.waterTop,
      waterBottom: this.waterBottom,
      scale: this.gameplayScale,
    };
    this.recalculateLayout();
    this.rescaleActiveObjects(previousLayout);
    this.background?.destroy();
    this.line?.destroy();
    this.hook?.destroy();
    this.chargeBar?.destroy();
    this.hud?.destroy();
    this.hint?.destroy();
    this.boatContainer?.destroy();
    this.catchToast?.destroy();
    this.rainOverlay?.destroy();
    this.hazards.forEach((hazard) => hazard.graphics.destroy());
    this.background = undefined;
    this.boatLabel = undefined;
    this.catchToast = undefined;
    this.rainOverlay = undefined;
    this.hazards = [];
    this.drawBackground();
    this.createReefHazards();
    this.drawRainOverlay();
    this.createBoat();
    this.createHud();
    this.createHook();
    this.updateHookedFishVisuals();
  }

  private handleInputDown() {
    this.isInputDown = true;
    if (this.hookState === 'idle') {
      this.hookState = 'charging';
      this.charge = 0;
    }
  }

  private handleInputUp() {
    this.isInputDown = false;
    if (this.hookState === 'charging') {
      this.castHook();
    }
  }

  private recalculateLayout() {
    const { width, height } = this.scale;
    this.layoutWidth = width;
    this.layoutHeight = height;
    this.gameplayScale = Math.max(0.45, height / referenceHeight);
    const depthShift = (this.level.depth - 1) * 0.08;
    this.waterTop = Math.max(this.s(112), Math.round(height * (0.28 - depthShift)));
    this.waterBottom = height - this.s(42);
    this.playerY = this.waterTop - this.s(28);
    this.playerX = Phaser.Math.Clamp(this.playerX, this.leftBoatLimit(), this.rightBoatLimit());
    if (this.hookState === 'idle' || this.hookState === 'charging') {
      const rest = this.lureRestPosition();
      this.hookX = rest.x;
      this.hookY = rest.y;
    }
  }

  private rescaleActiveObjects(previousLayout: { waterTop: number; waterBottom: number; scale: number }) {
    const scaleRatio = previousLayout.scale > 0 ? this.gameplayScale / previousLayout.scale : 1;
    const mapWaterY = (y: number) => {
      const previousDepth = Math.max(1, previousLayout.waterBottom - previousLayout.waterTop);
      const depthRatio = Phaser.Math.Clamp((y - previousLayout.waterTop) / previousDepth, 0, 1);
      return Phaser.Math.Linear(this.waterTop, this.waterBottom, depthRatio);
    };

    this.playerX = Phaser.Math.Clamp(this.playerX * scaleRatio, this.leftBoatLimit(), this.rightBoatLimit());
    if (this.hookState !== 'idle' && this.hookState !== 'charging') {
      this.hookX *= scaleRatio;
      this.hookY = mapWaterY(this.hookY);
      this.hookVelocityX *= scaleRatio;
      this.hookVelocityY *= scaleRatio;
      this.keepHookInWater();
      this.enforceLineLength();
    } else {
      const rest = this.lureRestPosition();
      this.hookX = rest.x;
      this.hookY = rest.y;
    }

    for (const swimmer of this.fish) {
      swimmer.sprite.x *= scaleRatio;
      swimmer.sprite.y = mapWaterY(swimmer.sprite.y);
      swimmer.speed *= scaleRatio;
      if (swimmer.escapeVelocityY !== undefined) {
        swimmer.escapeVelocityY *= scaleRatio;
      }
      this.resizeFishSprite(swimmer.sprite, swimmer.species, swimmer.weightLb);
    }

    for (const fish of this.hookedFish) {
      this.resizeFishSprite(fish.sprite, fish.species, fish.weightLb);
    }
  }

  private s(value: number) {
    return value * this.gameplayScale;
  }

  private fontSize(value: number) {
    return `${Math.max(10, Math.round(this.s(value)))}px`;
  }

  private rodTip() {
    return { x: this.playerX + this.s(58) * this.boatFacing, y: this.playerY - this.s(12) };
  }

  private lureRestPosition() {
    return { x: this.playerX, y: this.playerY + this.s(14) };
  }

  private equippedAttractor(): ActiveAttractor {
    const baitUses = this.save.baitInventory[this.save.equippedBaitId] ?? 0;
    if (this.save.activeAttractorKind === 'bait' && baitUses > 0) {
      return { kind: 'bait', item: this.bait };
    }
    return { kind: 'lure', item: this.lure };
  }

  private currentAttractor(): ActiveAttractor {
    return this.castAttractor ?? this.equippedAttractor();
  }

  private refreshActiveChum() {
    const activeChum = this.save.activeChumId ? chumById.get(this.save.activeChumId) : undefined;
    const isActive = Boolean(activeChum && (this.save.chumExpiresAt ?? 0) > Date.now());
    this.activeChum = isActive ? activeChum : undefined;
    if (this.save.activeChumId && !isActive) {
      this.setCurrentLevelSave({
        ...this.save,
        activeChumId: undefined,
        chumExpiresAt: undefined,
      });
    }
  }

  private maxLineLength() {
    return this.s(this.rod.maxCastDistance);
  }

  private maxFishForCurrentConditions() {
    const rainMultiplier = this.isRaining() ? (this.level.rainEvent?.spawnMultiplier ?? 1) : 1;
    return Math.round(maxActiveFish * (this.activeChum?.spawnMultiplier ?? 1) * rainMultiplier);
  }

  private drawBackground() {
    const { width, height } = this.scale;
    const palette = this.level.palette;
    const graphics = this.add.graphics();
    this.background = graphics;
    graphics.setDepth(-10);
    graphics.fillGradientStyle(palette.skyTop, palette.skyTop, palette.skyBottom, palette.skyBottom, 1);
    graphics.fillRect(0, 0, width, this.waterTop);
    graphics.fillStyle(palette.shore, 1);
    graphics.fillRect(0, this.waterTop - this.s(24), width, this.s(30));
    graphics.fillGradientStyle(palette.waterTop, palette.waterTop, palette.waterBottom, palette.waterBottom, 0.94);
    graphics.fillRect(0, this.waterTop, width, this.waterBottom - this.waterTop);
    graphics.fillStyle(palette.lakeBed, 1);
    graphics.fillRect(0, this.waterBottom, width, height - this.waterBottom);

    graphics.lineStyle(this.s(2), 0xeff9d7, 0.25);
    for (let x = -this.s(20); x < width + this.s(40); x += this.s(96)) {
      const points = [
        new Phaser.Math.Vector2(x, this.waterTop + this.s(4)),
        new Phaser.Math.Vector2(x + this.s(38), this.waterTop - this.s(5)),
        new Phaser.Math.Vector2(x + this.s(86), this.waterTop + this.s(4)),
      ];
      new Phaser.Curves.Spline(points).draw(graphics, 18);
    }

    for (let i = 0; i < 28; i += 1) {
      const x = (i * 97) % width;
      const y = this.waterBottom + this.s((i * 13) % 23);
      graphics.fillStyle(i % 2 === 0 ? 0x5d543f : 0x8f7950, 0.85);
      graphics.fillEllipse(x, y, this.s(26 + (i % 4) * 8), this.s(8 + (i % 3) * 3));
    }

    graphics.lineStyle(this.s(3), 0x39664f, 0.8);
    for (let i = 0; i < 22; i += 1) {
      const x = this.s(130) + ((i * this.s(173)) % Math.max(this.s(240), width - this.s(160)));
      const h = this.s(20 + (i % 5) * 12);
      const points = [
        new Phaser.Math.Vector2(x, this.waterBottom),
        new Phaser.Math.Vector2(x - this.s(8), this.waterBottom - h * 0.45),
        new Phaser.Math.Vector2(x + this.s(2), this.waterBottom - h),
      ];
      new Phaser.Curves.Spline(points).draw(graphics, 12);
    }
  }

  private createBoat() {
    const hull = this.add.graphics();
    hull.fillStyle(this.boat.id === 'bass-boat' ? 0xc84b45 : this.boat.id === 'rowboat' ? 0x8a5636 : 0x704a2e, 1);
    hull.fillRoundedRect(this.s(-66), this.s(-6), this.s(132), this.s(16), this.s(4));
    hull.fillStyle(this.boat.id === 'bass-boat' ? 0xf1d7a2 : 0xa66940, 1);
    hull.fillRoundedRect(this.s(-34), this.s(-34), this.s(76), this.s(25), this.s(3));
    hull.lineStyle(this.s(3), 0x4a2f20, 1);
    hull.beginPath();
    hull.moveTo(this.s(-46), this.s(-40));
    hull.lineTo(this.s(42), this.s(-70));
    hull.strokePath();

    const label = this.add.text(this.s(-78), this.s(-58), 'Angler', {
      color: '#1f3436',
      fontSize: this.fontSize(13),
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.boatLabel = label;
    this.boatContainer = this.add.container(this.playerX, this.waterTop - this.s(8), [hull, label]);
    this.updateBoatFacing();
  }

  private updateBoat(delta: number) {
    const movingLeft = this.cursors?.left.isDown || this.keyA?.isDown;
    const movingRight = this.cursors?.right.isDown || this.keyD?.isDown;
    const moveAxis = movingLeft && !movingRight ? -1 : movingRight && !movingLeft ? 1 : 0;
    const lineIsOut = this.hookState !== 'idle' && this.hookState !== 'charging';
    if (!lineIsOut && moveAxis !== 0) {
      this.boatFacing = moveAxis;
      this.updateBoatFacing();
      this.playerX = Phaser.Math.Clamp(this.playerX + moveAxis * this.s(this.boat.moveSpeed) * delta, this.leftBoatLimit(), this.rightBoatLimit());
      this.boatContainer?.setPosition(this.playerX, this.waterTop - this.s(8));
    }
    if (this.hookState === 'idle' || this.hookState === 'charging') {
      const rest = this.lureRestPosition();
      this.hookX = rest.x;
      this.hookY = rest.y;
      this.hook?.setPosition(this.hookX, this.hookY);
    }
  }

  private updateBoatFacing() {
    this.boatContainer?.setScale(this.boatFacing, 1);
    this.boatLabel?.setScale(this.boatFacing, 1);
  }

  private updateResetHold(delta: number) {
    if (!this.keyR?.isDown) {
      this.resetHoldSeconds = 0;
      return;
    }

    this.resetHoldSeconds = Math.min(resetHoldDurationSeconds, this.resetHoldSeconds + delta);
    if (this.resetHoldSeconds >= resetHoldDurationSeconds) {
      this.resetHoldSeconds = 0;
      this.gameSave = this.saveStore.reset();
      this.scene.restart();
    }
  }

  private leftBoatLimit() {
    return this.s(78);
  }

  private rightBoatLimit() {
    return Math.max(this.leftBoatLimit(), this.scale.width - this.s(92));
  }

  private createHud() {
    const textWidth = Math.max(this.s(320), this.scale.width - this.s(36));
    this.hud = this.add.text(this.s(18), this.s(16), '', {
      color: '#f4fff8',
      fontSize: this.fontSize(16),
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'rgba(16, 35, 43, 0.55)',
      padding: { x: this.s(12), y: this.s(8) },
      wordWrap: { width: textWidth },
    });
    this.hint = this.add.text(this.s(18), this.s(76), 'Arrow keys or A/D move boat. Hold mouse or Space to cast and reel. S shop. I index. Hold R to reset save.', {
      color: '#d6ebe6',
      fontSize: this.fontSize(14),
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'rgba(16, 35, 43, 0.45)',
      padding: { x: this.s(12), y: this.s(7) },
      wordWrap: { width: textWidth },
    });
    this.chargeBar = this.add.graphics();
  }

  private createHook() {
    this.line = this.add.graphics();
    this.hook = this.add.circle(this.hookX, this.hookY, this.s(7), 0xece7cf, 1).setStrokeStyle(this.s(2), 0x313a3a);
  }

  private castHook() {
    const power = Phaser.Math.Clamp(this.charge, 0.12, 1);
    const rest = this.lureRestPosition();
    this.castAttractor = this.equippedAttractor();
    if (this.castAttractor.kind === 'bait') {
      this.setCurrentLevelSave(consumeBaitUse(this.save, this.castAttractor.item.id));
    }
    this.hookX = rest.x;
    this.hookY = rest.y;
    this.hookVelocityX = (this.s(260) + this.maxLineLength() * 1.05) * power * this.boatFacing;
    this.hookVelocityY = this.s(-210) * power - this.s(42);
    this.hookState = 'cast';
  }

  private updateHook(delta: number) {
    if (this.hookState === 'charging') {
      this.charge = Math.min(1, this.charge + delta * 0.72);
    }

    if (this.hookState === 'cast') {
      this.hookVelocityY += this.s(760) * delta;
      this.hookX += this.hookVelocityX * delta;
      this.hookY += this.hookVelocityY * delta;
      if (this.hookY >= this.waterTop + this.s(12)) {
        this.hookY = this.waterTop + this.s(12);
        this.hookVelocityX *= 0.32;
        this.hookVelocityY = this.sinkSpeed() * 0.28;
        this.hookState = this.isInputDown ? 'reeling' : 'sinking';
      }
    } else if (this.hookState === 'sinking') {
      if (this.isInputDown) {
        this.hookState = 'reeling';
      } else {
        this.hookVelocityX *= Math.pow(0.08, delta);
        this.hookVelocityY = Phaser.Math.Linear(this.hookVelocityY, this.sinkSpeed(), Math.min(1, delta * 3.4));
        this.hookX += this.hookVelocityX * delta;
        this.hookY += this.hookVelocityY * delta;
      }
    } else if (this.hookState === 'reeling') {
      if (!this.isInputDown) {
        this.hookState = 'sinking';
      } else {
        const speed = this.s(this.rod.reelSpeed);
        const tip = this.rodTip();
        const distance = Phaser.Math.Distance.Between(this.hookX, this.hookY, tip.x, tip.y);
        if (distance < this.s(18)) {
          this.landHookedFish();
        } else {
          const step = Math.min(distance, speed * delta);
          const angle = Phaser.Math.Angle.Between(this.hookX, this.hookY, tip.x, tip.y);
          this.hookVelocityX = Math.cos(angle) * speed;
          this.hookVelocityY = Math.sin(angle) * speed;
          this.hookX += Math.cos(angle) * step;
          this.hookY += Math.sin(angle) * step;
        }
      }
    }

    if (this.hookState !== 'idle' && this.hookState !== 'charging') {
      this.keepHookInWater();
      this.enforceLineLength();
    }
    this.hook.setPosition(this.hookX, this.hookY);
    this.updateHookedFishVisuals();
    this.drawCharge();
  }

  private sinkSpeed() {
    const attractor = this.currentAttractor().item;
    if (attractor.targetDepth === 'deep') {
      return this.s(170);
    }
    if (attractor.targetDepth === 'mid') {
      return this.s(130);
    }
    return this.s(96);
  }

  private keepHookInWater() {
    if (this.hookY > this.waterBottom - this.s(24)) {
      this.hookY = this.waterBottom - this.s(24);
      this.hookVelocityY = Math.min(0, this.hookVelocityY);
    }
  }

  private enforceLineLength() {
    const tip = this.rodTip();
    const distance = Phaser.Math.Distance.Between(tip.x, tip.y, this.hookX, this.hookY);
    const maxLength = this.maxLineLength();
    if (distance <= maxLength || distance <= 0) {
      return;
    }

    const unitX = (this.hookX - tip.x) / distance;
    const unitY = (this.hookY - tip.y) / distance;
    this.hookX = tip.x + unitX * maxLength;
    this.hookY = tip.y + unitY * maxLength;

    const outwardVelocity = this.hookVelocityX * unitX + this.hookVelocityY * unitY;
    if (outwardVelocity > 0) {
      this.hookVelocityX -= outwardVelocity * unitX;
      this.hookVelocityY -= outwardVelocity * unitY;
    }
  }

  private totalHookedWeight() {
    return this.hookedFish.reduce((total, fish) => total + fish.weightLb, 0);
  }

  private updateHookedFishVisuals() {
    this.hookedFish.forEach((fish, index) => {
      const offsetX = this.s(((index % 3) - 1) * 12);
      const offsetY = this.s(18 + Math.floor(index / 3) * 12);
      fish.sprite.setPosition(this.hookX + offsetX, this.hookY + offsetY);
      fish.sprite.setDepth(5);
      fish.sprite.setAlpha(0.88);
    });
  }

  private resetHookToBoat() {
    const rest = this.lureRestPosition();
    this.hookState = 'idle';
    this.charge = 0;
    this.hookVelocityX = 0;
    this.hookVelocityY = 0;
    this.hookX = rest.x;
    this.hookY = rest.y;
    this.castAttractor = undefined;
    this.hook.setPosition(this.hookX, this.hookY);
  }

  private snapLine(titleText = 'Line snapped', detailText?: string) {
    const lostCount = this.hookedFish.length;
    const lostWeight = this.totalHookedWeight();
    this.releaseHookedFish();
    this.hookedFish = [];
    this.showToast(titleText, detailText ?? `Lost ${lostCount} fish at ${lostWeight.toFixed(2)} lb. Upgrade rods to handle more weight.`);
    this.resetHookToBoat();
  }

  private releaseHookedFish() {
    this.hookedFish.forEach((fish, index) => {
      const horizontalDistance = fish.sprite.x - this.hookX;
      const randomSide: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      const direction: 1 | -1 = Math.abs(horizontalDistance) > this.s(6) ? (horizontalDistance > 0 ? 1 : -1) : randomSide;
      const yOffset = this.s(Phaser.Math.Between(-34, 34) + (index - (this.hookedFish.length - 1) / 2) * 14);

      fish.sprite.setPosition(
        this.hookX + direction * this.s(Phaser.Math.Between(18, 42)),
        Phaser.Math.Clamp(this.hookY + yOffset, this.waterTop + this.s(28), this.waterBottom - this.s(38)),
      );
      fish.sprite.setFlipX(direction === 1);
      fish.sprite.setAlpha(0.92);
      fish.sprite.setDepth(2);

      this.fish.push({
        sprite: fish.sprite,
        species: fish.species,
        weightLb: fish.weightLb,
        direction,
        speed: this.s(Phaser.Math.FloatBetween(fish.species.speedRange[1] * 1.2, fish.species.speedRange[1] * 1.65)),
        sway: Phaser.Math.FloatBetween(0, Math.PI * 2),
        escapeVelocityY: this.s(Phaser.Math.Between(-70, 70)),
      });
    });
  }

  private landHookedFish() {
    if (this.hookedFish.length === 0) {
      this.resetHookToBoat();
      return;
    }

    const catches = this.hookedFish.map((fish) => applySaleMultiplier(createCaughtFish(fish.species, fish.weightLb), this.boat.cashMultiplier));
    const totalValue = catches.reduce((total, fish) => total + fish.value, 0);
    const totalWeight = catches.reduce((total, fish) => total + fish.weightLb, 0);
    let updatedSave = this.save;
    catches.forEach((caught) => {
      updatedSave = recordCatch(updatedSave, caught);
    });
    this.setCurrentLevelSave(updatedSave);
    this.hookedFish.forEach((fish) => fish.sprite.destroy());
    this.hookedFish = [];
    this.showToast(
      `Landed ${catches.length} fish`,
      `${totalWeight.toFixed(2)} lb sold for $${totalValue} (${this.boat.displayName} x${this.boat.cashMultiplier.toFixed(1)}).`,
    );
    this.resetHookToBoat();
  }

  private seedVisibleFish() {
    for (let index = 0; index < 12 && this.fish.length < initialVisibleFishTarget; index += 1) {
      this.spawnFish(true);
    }
  }

  private spawnFish(startOnScreen: boolean) {
    const openSlots = this.maxFishForCurrentConditions() - this.fish.length;
    if (openSlots <= 0) {
      return;
    }

    const depthBias = this.isRaining() ? (this.level.rainEvent?.depthBias ?? 0) : 0;
    const depth = Phaser.Math.Clamp(Phaser.Math.FloatBetween(0.16, 0.98) + depthBias, 0.16, 0.98);
    const attractor = this.currentAttractor();
    const species = chooseWeightedFish(this.level.fishPool, depth, attractor.item, attractor.kind, this.activeChum);
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const groupSize = Math.min(this.groupSizeFor(species), openSlots);
    const baseX = startOnScreen
      ? Phaser.Math.Between(Math.max(this.s(220), Math.round(this.scale.width * 0.18)), Math.max(this.s(260), this.scale.width - this.s(90)))
      : direction === 1
        ? -this.s(80)
        : this.scale.width + this.s(80);
    const baseY = Phaser.Math.Linear(this.waterTop + this.s(30), this.waterBottom - this.s(38), depth);
    const spacing = this.s(Phaser.Math.Between(34, 58));

    for (let index = 0; index < groupSize; index += 1) {
      const xOffset = startOnScreen
        ? Phaser.Math.Between(-spacing, spacing)
        : direction === 1
          ? -index * spacing
          : index * spacing;
      const yOffset = this.s(Phaser.Math.Between(-18, 18) + index * 3);
      this.addSwimmingFish(species, direction, baseX + xOffset, Phaser.Math.Clamp(baseY + yOffset, this.waterTop + this.s(28), this.waterBottom - this.s(38)));
    }
  }

  private groupSizeFor(species: FishSpecies) {
    if (Math.random() > species.schoolChance) {
      return 1;
    }
    const [min, max] = species.schoolSizeRange;
    return Phaser.Math.Between(min, max);
  }

  private addSwimmingFish(species: FishSpecies, direction: 1 | -1, x: number, y: number) {
    const weightLb = randomFishWeight(species);
    const attractor = this.currentAttractor();
    const sprite = this.add.image(x, y, species.assetId);
    sprite.setOrigin(0.5);
    this.resizeFishSprite(sprite, species, weightLb);
    sprite.setFlipX(direction === 1);
    sprite.setAlpha(0.92);
    this.fish.push({
      sprite,
      species,
      weightLb,
      direction,
      speed: this.s(Phaser.Math.FloatBetween(species.speedRange[0], species.speedRange[1]) * attractor.item.attractionBonus * Phaser.Math.FloatBetween(0.92, 1.08)),
      sway: Phaser.Math.FloatBetween(0, Math.PI * 2),
    });
  }

  private resizeFishSprite(sprite: Phaser.GameObjects.Image, species: FishSpecies, weightLb: number) {
    const weightRatio = Phaser.Math.Clamp((weightLb - species.minimumWeightLb) / (species.trophyWeightLb - species.minimumWeightLb), 0, 1);
    const sizeMultiplier = 0.74 + Math.sqrt(weightRatio) * 0.74;
    sprite.setDisplaySize(this.s((72 + species.rarityMultiplier * 18) * sizeMultiplier), this.s((36 + species.rarityMultiplier * 8) * sizeMultiplier));
  }

  private loadSaveAndEquipment() {
    this.gameSave = this.saveStore.reload();
    this.level = levelById.get(this.gameSave.currentLevelId) ?? firstLevel;
    this.save = getLevelSave(this.gameSave, this.level.id);
    this.rod = rodById.get(this.save.equippedRodId) ?? rodById.get('twig-rod')!;
    this.lure = lureById.get(this.save.equippedLureId) ?? lureById.get('starter-bobber')!;
    this.bait = baitById.get(this.save.equippedBaitId) ?? baitById.get('red-worms')!;
    this.boat = boatById.get(this.save.equippedBoatId) ?? boatById.get('dock')!;
  }

  private setCurrentLevelSave(levelSave: PlayerLevelSave) {
    this.gameSave = this.saveStore.setCurrentLevelSave(levelSave);
    this.save = getLevelSave(this.gameSave, this.level.id);
  }

  private handleResume() {
    const previousLevelId = this.level.id;
    this.loadSaveAndEquipment();
    if (this.level.id !== previousLevelId) {
      this.scene.restart();
      return;
    }
    this.refreshActiveChum();
    this.boatContainer?.destroy();
    this.boatLabel = undefined;
    this.playerX = Phaser.Math.Clamp(this.playerX, this.leftBoatLimit(), this.rightBoatLimit());
    this.createBoat();
  }

  private updateFish(delta: number) {
    const width = this.scale.width;
    for (const swimmer of this.fish) {
      this.updateFishAttraction(swimmer, delta);
      swimmer.sprite.x += swimmer.direction * swimmer.speed * delta;
      const escapeVelocityY = swimmer.escapeVelocityY ?? 0;
      swimmer.sprite.y = Phaser.Math.Clamp(
        swimmer.sprite.y + escapeVelocityY * delta + Math.sin(this.time.now * 0.002 + swimmer.sway) * this.s(0.22),
        this.waterTop + this.s(28),
        this.waterBottom - this.s(38),
      );
      if (swimmer.escapeVelocityY !== undefined) {
        swimmer.escapeVelocityY = Phaser.Math.Linear(swimmer.escapeVelocityY, 0, Math.min(1, delta * 1.8));
        if (Math.abs(swimmer.escapeVelocityY) < 2) {
          swimmer.escapeVelocityY = undefined;
        }
      }
    }
    this.fish = this.fish.filter((swimmer) => {
      const visible = swimmer.sprite.x > -this.s(140) && swimmer.sprite.x < width + this.s(140);
      if (!visible) {
        swimmer.sprite.destroy();
      }
      return visible;
    });
  }

  private updateFishAttraction(swimmer: SwimmingFish, delta: number) {
    if (!this.castAttractor || this.hookY < this.waterTop) {
      return;
    }

    const attractor = this.castAttractor.item;
    const distance = Phaser.Math.Distance.Between(this.hookX, this.hookY, swimmer.sprite.x, swimmer.sprite.y);
    if (distance > this.s(attractor.attractRadius)) {
      return;
    }

    if ((swimmer.nextAttractionCheckAt ?? 0) <= this.time.now) {
      swimmer.nextAttractionCheckAt = this.time.now + Phaser.Math.Between(420, 820);
      const chance = attractionChanceForFish(swimmer.species, attractor, this.castAttractor.kind);
      if (Math.random() < chance) {
        swimmer.attractedUntil = this.time.now + Phaser.Math.Between(850, 1500);
      }
    }

    if ((swimmer.attractedUntil ?? 0) <= this.time.now) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(swimmer.sprite.x, swimmer.sprite.y, this.hookX, this.hookY);
    const pull = this.s(attractor.attractStrength) * delta;
    swimmer.sprite.x += Math.cos(angle) * pull;
    swimmer.sprite.y += Math.sin(angle) * pull * 0.65;
    swimmer.direction = Math.cos(angle) >= 0 ? 1 : -1;
    swimmer.sprite.setFlipX(swimmer.direction === 1);
  }

  private checkCatch() {
    if (this.hookState === 'idle' || this.hookState === 'charging' || this.hookY < this.waterTop) {
      return;
    }
    const radius = this.s(27 + this.currentAttractor().item.attractionBonus * 5);
    const caught = this.fish.find((swimmer) => Phaser.Math.Distance.Between(this.hookX, this.hookY, swimmer.sprite.x, swimmer.sprite.y) < radius);
    if (!caught) {
      return;
    }
    this.fish = this.fish.filter((swimmer) => swimmer !== caught);
    this.hookedFish.push({
      sprite: caught.sprite,
      species: caught.species,
      weightLb: caught.weightLb,
    });
    const totalWeight = this.totalHookedWeight();
    if (totalWeight >= this.rod.weightHandling) {
      this.snapLine();
      return;
    }
    this.showToast(
      `Hooked ${caught.species.displayName}`,
      `${caught.weightLb.toFixed(2)} lb on line. ${totalWeight.toFixed(2)} / ${this.rod.weightHandling} lb limit.`,
    );
    this.hookState = this.isInputDown ? 'reeling' : 'sinking';
  }

  private showToast(titleText: string, detailText: string) {
    this.catchToast?.destroy();
    const panel = this.add.rectangle(0, 0, this.s(360), this.s(86), 0x15313a, 0.94).setStrokeStyle(this.s(1), 0xf4cf70, 0.8);
    const title = this.add.text(this.s(-166), this.s(-31), titleText, {
      color: '#f4fff8',
      fontSize: this.fontSize(18),
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    const detail = this.add.text(this.s(-166), this.s(2), detailText, {
      color: '#ffd66b',
      fontSize: this.fontSize(16),
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: this.s(322) },
    });
    this.catchToast = this.add.container(this.scale.width / 2, this.s(104), [panel, title, detail]);
    this.tweens.add({
      targets: this.catchToast,
      alpha: 0,
      y: this.s(82),
      delay: 1700,
      duration: 420,
      onComplete: () => this.catchToast?.destroy(),
    });
  }

  private drawLine() {
    const tip = this.rodTip();
    const weightRatio = Phaser.Math.Clamp(this.totalHookedWeight() / this.rod.weightHandling, 0, 1);
    const lineColor = weightRatio > 0.82 ? 0xff7869 : weightRatio > 0.55 ? 0xf4cf70 : 0xf2ead7;
    this.line.clear();
    this.line.lineStyle(this.s(2), lineColor, 0.82);
    this.line.beginPath();
    this.line.moveTo(tip.x, tip.y);
    this.line.lineTo(this.hookX, this.hookY);
    this.line.strokePath();
    this.line.lineStyle(this.s(4), 0x4a2f20, 1);
    this.line.beginPath();
    this.line.moveTo(this.playerX + this.s(18) * this.boatFacing, this.playerY - this.s(16));
    this.line.lineTo(this.playerX + this.s(80) * this.boatFacing, this.playerY - this.s(46));
    this.line.strokePath();
  }

  private drawCharge() {
    this.chargeBar.clear();
    if (this.hookState !== 'charging') {
      return;
    }
    this.chargeBar.fillStyle(0x0e252d, 0.74);
    this.chargeBar.fillRoundedRect(this.playerX - this.s(18), this.playerY - this.s(80), this.s(144), this.s(12), this.s(6));
    this.chargeBar.fillStyle(0xf4cf70, 1);
    this.chargeBar.fillRoundedRect(this.playerX - this.s(18), this.playerY - this.s(80), this.s(144) * this.charge, this.s(12), this.s(6));
  }

  private updateHud() {
    const catches = Object.values(this.save.catchLog).reduce((sum, entry) => sum + entry.count, 0);
    const lineLoad = this.totalHookedWeight();
    const attractor = this.currentAttractor();
    const baitUses = attractor.kind === 'bait' ? this.save.baitInventory[attractor.item.id] ?? 0 : 0;
    const tackleText = attractor.kind === 'bait' ? `${attractor.item.displayName} (${baitUses})` : attractor.item.displayName;
    const lineText = lineLoad > 0 ? `  |  Line ${lineLoad.toFixed(2)}/${this.rod.weightHandling} lb` : '';
    const chumText = this.activeChum ? `  |  ${this.activeChum.displayName} ${Math.max(0, Math.ceil(((this.save.chumExpiresAt ?? 0) - Date.now()) / 1000))}s` : '';
    const weatherText = this.isRaining() ? '  |  Rain' : '';
    const crabText = this.save.crabCatchLog?.count ? `  |  Crabs ${this.save.crabCatchLog.count}` : '';
    this.hud.setText(
      `Level ${this.level.levelNumber}: ${this.level.displayName}  |  $${this.save.money}  |  ${this.rod.displayName}  |  ${tackleText}  |  ${this.boat.displayName}  |  Catches ${catches}${crabText}${lineText}${chumText}${weatherText}`,
    );
    if (this.resetHoldSeconds > 0) {
      this.hint.setText(`Keep holding R to reset save: ${(resetHoldDurationSeconds - this.resetHoldSeconds).toFixed(1)}s`);
    } else if (this.hookState === 'idle') {
      this.hint.setText('Arrow keys or A/D move boat. Hold mouse or Space to charge cast. S shop. I index. M map. ` dev console. Hold R to reset save.');
    } else if (this.hookState === 'charging') {
      this.hint.setText('Release to cast.');
    } else if (this.hookedFish.length > 0) {
      this.hint.setText('Hold to reel hooked fish all the way in. Too much weight snaps the line.');
    } else {
      this.hint.setText('Hold mouse or Space to reel. Release to let the tackle sink. Boat movement is locked while cast.');
    }
  }

  private scheduleLevelEvents() {
    if (this.level.swarmEvent) {
      const [min, max] = this.level.swarmEvent.intervalMs;
      this.nextSwarmAt = this.time.now + Phaser.Math.Between(min, max);
    }
    if (this.level.rainEvent) {
      const [min, max] = this.level.rainEvent.intervalMs;
      this.nextRainAt = this.time.now + Phaser.Math.Between(min, max);
    }
    this.scheduleNextCrabCatch();
  }

  private updateLevelEvents() {
    if (this.level.swarmEvent && this.time.now >= this.nextSwarmAt) {
      this.triggerSwarmEvent();
      const [min, max] = this.level.swarmEvent.intervalMs;
      this.nextSwarmAt = this.time.now + Phaser.Math.Between(min, max);
    }

    if (this.level.rainEvent && this.time.now >= this.nextRainAt && !this.isRaining()) {
      this.rainUntil = this.time.now + this.level.rainEvent.durationMs;
      this.drawRainOverlay();
      this.showToast('Rain moving in', 'Deep fish are more active while the shower lasts.');
    }

    if (this.rainUntil > 0 && this.time.now >= this.rainUntil) {
      this.rainUntil = 0;
      this.rainOverlay?.destroy();
      this.rainOverlay = undefined;
      if (this.level.rainEvent) {
        const [min, max] = this.level.rainEvent.intervalMs;
        this.nextRainAt = this.time.now + Phaser.Math.Between(min, max);
      }
    }
  }

  private isRaining() {
    return this.rainUntil > this.time.now;
  }

  private triggerSwarmEvent() {
    const config = this.level.swarmEvent;
    if (!config) {
      return;
    }
    const massive = Boolean(config.massiveSchoolSpeciesId) && Math.random() < (config.massiveSchoolChance ?? 0);
    const speciesId = massive
      ? config.massiveSchoolSpeciesId!
      : Phaser.Utils.Array.GetRandom(config.speciesIds);
    const species = fishById.get(speciesId);
    if (!species) {
      return;
    }
    this.spawnEventSchool(species, massive ? 18 : 9);
    this.showToast(massive ? 'Massive salmon run' : 'Fish swarm', `${species.displayName} are moving through the ${this.level.displayName}.`);
  }

  private spawnEventSchool(species: FishSpecies, count: number) {
    const openSlots = this.maxFishForCurrentConditions() - this.fish.length;
    const total = Math.min(count, Math.max(0, openSlots));
    if (total <= 0) {
      return;
    }
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const baseX = direction === 1 ? -this.s(110) : this.scale.width + this.s(110);
    const baseY = Phaser.Math.Linear(this.waterTop + this.s(34), this.waterBottom - this.s(42), Phaser.Math.FloatBetween(species.depthRange[0], species.depthRange[1]));
    for (let index = 0; index < total; index += 1) {
      const xOffset = direction === 1 ? -index * this.s(34) : index * this.s(34);
      const yOffset = this.s(Phaser.Math.Between(-28, 28));
      this.addSwimmingFish(species, direction, baseX + xOffset, Phaser.Math.Clamp(baseY + yOffset, this.waterTop + this.s(28), this.waterBottom - this.s(38)));
    }
  }

  private drawRainOverlay() {
    if (!this.isRaining()) {
      return;
    }
    this.rainOverlay?.destroy();
    const rain = this.add.graphics();
    rain.setDepth(20);
    rain.lineStyle(this.s(2), 0xd8eef2, 0.42);
    for (let index = 0; index < 90; index += 1) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.waterBottom);
      rain.beginPath();
      rain.moveTo(x, y);
      rain.lineTo(x - this.s(12), y + this.s(30));
      rain.strokePath();
    }
    this.rainOverlay = rain;
  }

  private scheduleNextCrabCatch() {
    const interval = this.crabCatchIntervalMs();
    this.nextCrabCatchAt = interval ? this.time.now + interval : 0;
  }

  private crabCatchIntervalMs() {
    const intervals = this.save.ownedCrabPotIds
      .map((id) => crabPotById.get(id)?.catchIntervalSeconds)
      .filter((seconds): seconds is number => typeof seconds === 'number');
    if (!this.level.crabMechanic || intervals.length === 0) {
      return 0;
    }
    return Math.min(...intervals) * 1000;
  }

  private updateCrabPots() {
    if (!this.level.crabMechanic || this.nextCrabCatchAt <= 0 || this.time.now < this.nextCrabCatchAt) {
      return;
    }
    const value = this.save.ownedCrabPotIds.reduce((total, id) => total + (crabPotById.get(id)?.valuePerCatch ?? 0), 0);
    if (value > 0) {
      this.setCurrentLevelSave(recordCrabCatch(this.save, value));
      this.showToast(`${this.level.crabMechanic.speciesName} pots`, `Sold a passive crab haul for $${value}.`);
    }
    this.scheduleNextCrabCatch();
  }

  private createReefHazards() {
    if (!this.level.hazards) {
      return;
    }
    const hazardCount = this.level.hazards.count;
    for (let index = 0; index < hazardCount; index += 1) {
      const xRatio = 0.16 + (index / Math.max(1, hazardCount - 1)) * 0.72;
      const yRatio = 0.72 + (index % 3) * 0.08;
      const radius = 20 + (index % 4) * 7;
      const graphics = this.add.graphics();
      graphics.setDepth(1);
      this.hazards.push({ xRatio, yRatio, radius, graphics });
      this.drawHazard(this.hazards[this.hazards.length - 1]);
    }
  }

  private drawHazard(hazard: ReefHazard) {
    const position = this.hazardPosition(hazard);
    hazard.graphics.clear();
    hazard.graphics.fillStyle(0xd35a6d, 0.78);
    hazard.graphics.fillTriangle(position.x, position.y - this.s(hazard.radius), position.x - this.s(hazard.radius * 0.8), position.y + this.s(hazard.radius), position.x + this.s(hazard.radius * 0.75), position.y + this.s(hazard.radius * 0.9));
    hazard.graphics.fillStyle(0xf0b65a, 0.76);
    hazard.graphics.fillCircle(position.x + this.s(8), position.y + this.s(5), this.s(hazard.radius * 0.42));
  }

  private hazardPosition(hazard: ReefHazard) {
    return {
      x: this.scale.width * hazard.xRatio,
      y: Phaser.Math.Linear(this.waterTop, this.waterBottom, hazard.yRatio),
    };
  }

  private checkHazardSnap() {
    if (!this.level.hazards || this.hookState === 'idle' || this.hookState === 'charging') {
      return;
    }
    const loadRatio = this.totalHookedWeight() / this.rod.weightHandling;
    if (loadRatio < this.level.hazards.snapLoadRatio) {
      return;
    }
    const tip = this.rodTip();
    const hitHazard = this.hazards.some((hazard) => {
      const position = this.hazardPosition(hazard);
      return Phaser.Geom.Intersects.LineToCircle(
        new Phaser.Geom.Line(tip.x, tip.y, this.hookX, this.hookY),
        new Phaser.Geom.Circle(position.x, position.y, this.s(hazard.radius)),
      );
    });
    if (hitHazard) {
      this.snapLine('Line cut on coral', 'The loaded line scraped a reef hazard and snapped.');
    }
  }

  private scheduleSpawn(delay?: number) {
    const [min, max] = this.level.spawnIntervalMs;
    const rainMultiplier = this.isRaining() ? (this.level.rainEvent?.spawnMultiplier ?? 1) : 1;
    const spawnMultiplier = (this.activeChum?.spawnMultiplier ?? 1) * rainMultiplier;
    this.nextSpawnAt = this.time.now + (delay ?? Phaser.Math.Between(min, max) / spawnMultiplier);
  }
}
