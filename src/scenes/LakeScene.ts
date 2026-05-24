import Phaser from 'phaser';
import { boatById, lureById, rodById } from '../data/items';
import { lakeLevel } from '../data/levels';
import { applySaleMultiplier, chooseWeightedFish, createCaughtFish, randomFishWeight, recordCatch } from '../systems/economy';
import { SaveStore } from '../systems/save';
import type { Boat, FishSpecies, LevelConfig, Lure, PlayerSave, Rod } from '../types';

type HookState = 'idle' | 'charging' | 'cast' | 'sinking' | 'reeling';

const maxActiveFish = 34;
const initialVisibleFishTarget = 24;

interface SwimmingFish {
  sprite: Phaser.GameObjects.Image;
  species: FishSpecies;
  weightLb: number;
  speed: number;
  direction: 1 | -1;
  sway: number;
}

interface HookedFish {
  sprite: Phaser.GameObjects.Image;
  species: FishSpecies;
  weightLb: number;
}

export class LakeScene extends Phaser.Scene {
  private readonly saveStore = new SaveStore();
  private level: LevelConfig = lakeLevel;
  private save!: PlayerSave;
  private rod!: Rod;
  private lure!: Lure;
  private boat!: Boat;
  private waterTop = 160;
  private waterBottom = 720;
  private playerX = 92;
  private playerY = 150;
  private hookState: HookState = 'idle';
  private hook!: Phaser.GameObjects.Arc;
  private line!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private chargeBar!: Phaser.GameObjects.Graphics;
  private boatContainer?: Phaser.GameObjects.Container;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private catchToast?: Phaser.GameObjects.Container;
  private charge = 0;
  private hookX = 92;
  private hookY = 150;
  private hookVelocityX = 0;
  private hookVelocityY = 0;
  private isInputDown = false;
  private fish: SwimmingFish[] = [];
  private hookedFish: HookedFish[] = [];
  private nextSpawnAt = 0;

  constructor() {
    super('Lake');
  }

  create() {
    this.save = this.saveStore.reload();
    this.rod = rodById.get(this.save.equippedRodId) ?? rodById.get('twig-rod')!;
    this.lure = lureById.get(this.save.equippedLureId) ?? lureById.get('starter-bobber')!;
    this.boat = boatById.get(this.save.equippedBoatId) ?? boatById.get('dock')!;
    this.recalculateLayout();
    this.drawBackground();
    this.createBoat();
    this.createHud();
    this.createHook();
    this.seedVisibleFish();
    this.scheduleSpawn(0);
    this.bindInput();
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.fish = [];
      this.hookedFish = [];
      this.boatContainer = undefined;
    });
  }

  update(_time: number, deltaMs: number) {
    const delta = deltaMs / 1000;
    this.updateBoat(delta);
    if (this.time.now >= this.nextSpawnAt && this.fish.length < maxActiveFish) {
      this.spawnFish(false);
      this.scheduleSpawn();
    }
    this.updateHook(delta);
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
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInputDown());
    this.input.keyboard?.on('keyup-SPACE', () => this.handleInputUp());
    this.input.keyboard?.on('keydown-S', () => this.scene.start('Shop'));
    this.input.keyboard?.on('keydown-R', () => {
      this.save = this.saveStore.reset();
      this.scene.restart();
    });
  }

  private handleResize() {
    this.recalculateLayout();
    this.children.removeAll();
    this.fish = [];
    this.hookedFish = [];
    this.drawBackground();
    this.createBoat();
    this.createHud();
    this.createHook();
    this.seedVisibleFish();
    this.scheduleSpawn(0);
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
    const { height } = this.scale;
    this.waterTop = Math.max(135, Math.round(height * 0.28));
    this.waterBottom = height - 42;
    this.playerY = this.waterTop - 28;
    this.playerX = Phaser.Math.Clamp(this.playerX, this.leftBoatLimit(), this.rightBoatLimit());
    if (this.hookState === 'idle' || this.hookState === 'charging') {
      const rest = this.lureRestPosition();
      this.hookX = rest.x;
      this.hookY = rest.y;
    }
  }

  private rodTip() {
    return { x: this.playerX + 58, y: this.playerY - 12 };
  }

  private lureRestPosition() {
    return { x: this.playerX, y: this.playerY + 14 };
  }

  private maxLineLength() {
    return this.rod.maxCastDistance;
  }

  private drawBackground() {
    const { width, height } = this.scale;
    const palette = this.level.palette;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(palette.skyTop, palette.skyTop, palette.skyBottom, palette.skyBottom, 1);
    graphics.fillRect(0, 0, width, this.waterTop);
    graphics.fillStyle(palette.shore, 1);
    graphics.fillRect(0, this.waterTop - 24, width, 30);
    graphics.fillGradientStyle(palette.waterTop, palette.waterTop, palette.waterBottom, palette.waterBottom, 0.94);
    graphics.fillRect(0, this.waterTop, width, this.waterBottom - this.waterTop);
    graphics.fillStyle(palette.lakeBed, 1);
    graphics.fillRect(0, this.waterBottom, width, height - this.waterBottom);

    graphics.lineStyle(2, 0xeff9d7, 0.25);
    for (let x = -20; x < width + 40; x += 96) {
      const points = [
        new Phaser.Math.Vector2(x, this.waterTop + 4),
        new Phaser.Math.Vector2(x + 38, this.waterTop - 5),
        new Phaser.Math.Vector2(x + 86, this.waterTop + 4),
      ];
      new Phaser.Curves.Spline(points).draw(graphics, 18);
    }

    for (let i = 0; i < 28; i += 1) {
      const x = (i * 97) % width;
      const y = this.waterBottom + ((i * 13) % 23);
      graphics.fillStyle(i % 2 === 0 ? 0x5d543f : 0x8f7950, 0.85);
      graphics.fillEllipse(x, y, 26 + (i % 4) * 8, 8 + (i % 3) * 3);
    }

    graphics.lineStyle(3, 0x39664f, 0.8);
    for (let i = 0; i < 22; i += 1) {
      const x = 130 + ((i * 173) % Math.max(240, width - 160));
      const h = 20 + (i % 5) * 12;
      const points = [
        new Phaser.Math.Vector2(x, this.waterBottom),
        new Phaser.Math.Vector2(x - 8, this.waterBottom - h * 0.45),
        new Phaser.Math.Vector2(x + 2, this.waterBottom - h),
      ];
      new Phaser.Curves.Spline(points).draw(graphics, 12);
    }
  }

  private createBoat() {
    const hull = this.add.graphics();
    hull.fillStyle(this.boat.id === 'bass-boat' ? 0xc84b45 : this.boat.id === 'rowboat' ? 0x8a5636 : 0x704a2e, 1);
    hull.fillRoundedRect(-66, -6, 132, 16, 4);
    hull.fillStyle(this.boat.id === 'bass-boat' ? 0xf1d7a2 : 0xa66940, 1);
    hull.fillRoundedRect(-34, -34, 76, 25, 3);
    hull.lineStyle(3, 0x4a2f20, 1);
    hull.beginPath();
    hull.moveTo(-46, -40);
    hull.lineTo(42, -70);
    hull.strokePath();

    const label = this.add.text(-78, -58, 'Angler', {
      color: '#1f3436',
      fontSize: '13px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.boatContainer = this.add.container(this.playerX, this.waterTop - 8, [hull, label]);
  }

  private updateBoat(delta: number) {
    const movingLeft = this.cursors?.left.isDown || this.keyA?.isDown;
    const movingRight = this.cursors?.right.isDown || this.keyD?.isDown;
    const moveAxis = movingLeft && !movingRight ? -1 : movingRight && !movingLeft ? 1 : 0;
    if (moveAxis !== 0) {
      this.playerX = Phaser.Math.Clamp(this.playerX + moveAxis * this.boat.moveSpeed * delta, this.leftBoatLimit(), this.rightBoatLimit());
      this.boatContainer?.setPosition(this.playerX, this.waterTop - 8);
    }
    if (this.hookState === 'idle' || this.hookState === 'charging') {
      const rest = this.lureRestPosition();
      this.hookX = rest.x;
      this.hookY = rest.y;
      this.hook?.setPosition(this.hookX, this.hookY);
    }
  }

  private leftBoatLimit() {
    return 78;
  }

  private rightBoatLimit() {
    return Math.max(this.leftBoatLimit(), this.scale.width - 92);
  }

  private createHud() {
    this.hud = this.add.text(18, 16, '', {
      color: '#f4fff8',
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'rgba(16, 35, 43, 0.55)',
      padding: { x: 12, y: 8 },
    });
    this.hint = this.add.text(18, 76, 'Arrow keys move boat. Hold mouse or Space to cast and reel. S opens shop. R resets save.', {
      color: '#d6ebe6',
      fontSize: '14px',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: 'rgba(16, 35, 43, 0.45)',
      padding: { x: 12, y: 7 },
    });
    this.chargeBar = this.add.graphics();
  }

  private createHook() {
    this.line = this.add.graphics();
    this.hook = this.add.circle(this.hookX, this.hookY, 7, 0xece7cf, 1).setStrokeStyle(2, 0x313a3a);
  }

  private castHook() {
    const power = Phaser.Math.Clamp(this.charge, 0.12, 1);
    const rest = this.lureRestPosition();
    this.hookX = rest.x;
    this.hookY = rest.y;
    this.hookVelocityX = (260 + this.maxLineLength() * 1.05) * power;
    this.hookVelocityY = -210 * power - 42;
    this.hookState = 'cast';
  }

  private updateHook(delta: number) {
    if (this.hookState === 'charging') {
      this.charge = Math.min(1, this.charge + delta * 0.72);
    }

    if (this.hookState === 'cast') {
      this.hookVelocityY += 760 * delta;
      this.hookX += this.hookVelocityX * delta;
      this.hookY += this.hookVelocityY * delta;
      if (this.hookY >= this.waterTop + 12) {
        this.hookY = this.waterTop + 12;
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
        const speed = this.rod.reelSpeed;
        const tip = this.rodTip();
        const distance = Phaser.Math.Distance.Between(this.hookX, this.hookY, tip.x, tip.y);
        if (distance < 18) {
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
    if (this.lure.targetDepth === 'deep') {
      return 170;
    }
    if (this.lure.targetDepth === 'mid') {
      return 130;
    }
    return 96;
  }

  private keepHookInWater() {
    if (this.hookY > this.waterBottom - 24) {
      this.hookY = this.waterBottom - 24;
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
      const offsetX = ((index % 3) - 1) * 12;
      const offsetY = 18 + Math.floor(index / 3) * 12;
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
    this.hook.setPosition(this.hookX, this.hookY);
  }

  private snapLine() {
    const lostCount = this.hookedFish.length;
    const lostWeight = this.totalHookedWeight();
    this.hookedFish.forEach((fish) => fish.sprite.destroy());
    this.hookedFish = [];
    this.showToast('Line snapped', `Lost ${lostCount} fish at ${lostWeight.toFixed(2)} lb. Upgrade rods to handle more weight.`);
    this.resetHookToBoat();
  }

  private landHookedFish() {
    if (this.hookedFish.length === 0) {
      this.resetHookToBoat();
      return;
    }

    const catches = this.hookedFish.map((fish) => applySaleMultiplier(createCaughtFish(fish.species, fish.weightLb), this.boat.cashMultiplier));
    const totalValue = catches.reduce((total, fish) => total + fish.value, 0);
    const totalWeight = catches.reduce((total, fish) => total + fish.weightLb, 0);
    catches.forEach((caught) => {
      this.save = this.saveStore.set(recordCatch(this.save, caught));
    });
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
    const openSlots = maxActiveFish - this.fish.length;
    if (openSlots <= 0) {
      return;
    }

    const depth = Phaser.Math.FloatBetween(0.16, 0.98);
    const species = chooseWeightedFish(this.level.fishPool, depth, this.lure.tags, this.lure.rarityBonus);
    const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const groupSize = Math.min(this.groupSizeFor(species), openSlots);
    const baseX = startOnScreen
      ? Phaser.Math.Between(Math.max(220, Math.round(this.scale.width * 0.18)), Math.max(260, this.scale.width - 90))
      : direction === 1
        ? -80
        : this.scale.width + 80;
    const baseY = Phaser.Math.Linear(this.waterTop + 30, this.waterBottom - 38, depth);
    const spacing = Phaser.Math.Between(34, 58);

    for (let index = 0; index < groupSize; index += 1) {
      const xOffset = startOnScreen
        ? Phaser.Math.Between(-spacing, spacing)
        : direction === 1
          ? -index * spacing
          : index * spacing;
      const yOffset = Phaser.Math.Between(-18, 18) + index * 3;
      this.addSwimmingFish(species, direction, baseX + xOffset, Phaser.Math.Clamp(baseY + yOffset, this.waterTop + 28, this.waterBottom - 38));
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
    const [minWeight, maxWeight] = species.weightRangeLb;
    const weightRatio = Phaser.Math.Clamp((weightLb - minWeight) / (maxWeight - minWeight), 0, 1);
    const sizeMultiplier = 0.74 + Math.sqrt(weightRatio) * 0.74;
    const sprite = this.add.image(x, y, species.assetId);
    sprite.setOrigin(0.5);
    sprite.setDisplaySize((72 + species.rarityMultiplier * 18) * sizeMultiplier, (36 + species.rarityMultiplier * 8) * sizeMultiplier);
    sprite.setFlipX(direction === 1);
    sprite.setAlpha(0.92);
    this.fish.push({
      sprite,
      species,
      weightLb,
      direction,
      speed: Phaser.Math.FloatBetween(species.speedRange[0], species.speedRange[1]) * this.lure.attractionBonus * Phaser.Math.FloatBetween(0.92, 1.08),
      sway: Phaser.Math.FloatBetween(0, Math.PI * 2),
    });
  }

  private updateFish(delta: number) {
    const width = this.scale.width;
    for (const swimmer of this.fish) {
      swimmer.sprite.x += swimmer.direction * swimmer.speed * delta;
      swimmer.sprite.y += Math.sin(this.time.now * 0.002 + swimmer.sway) * 0.22;
    }
    this.fish = this.fish.filter((swimmer) => {
      const visible = swimmer.sprite.x > -140 && swimmer.sprite.x < width + 140;
      if (!visible) {
        swimmer.sprite.destroy();
      }
      return visible;
    });
  }

  private checkCatch() {
    if (this.hookState === 'idle' || this.hookState === 'charging' || this.hookY < this.waterTop) {
      return;
    }
    const radius = 27 + this.lure.attractionBonus * 5;
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
    const panel = this.add.rectangle(0, 0, 360, 86, 0x15313a, 0.94).setStrokeStyle(1, 0xf4cf70, 0.8);
    const title = this.add.text(-166, -31, titleText, {
      color: '#f4fff8',
      fontSize: '18px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    const detail = this.add.text(-166, 2, detailText, {
      color: '#ffd66b',
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: 322 },
    });
    this.catchToast = this.add.container(this.scale.width / 2, 104, [panel, title, detail]);
    this.tweens.add({
      targets: this.catchToast,
      alpha: 0,
      y: 82,
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
    this.line.lineStyle(2, lineColor, 0.82);
    this.line.beginPath();
    this.line.moveTo(tip.x, tip.y);
    this.line.lineTo(this.hookX, this.hookY);
    this.line.strokePath();
    this.line.lineStyle(4, 0x4a2f20, 1);
    this.line.beginPath();
    this.line.moveTo(this.playerX + 18, this.playerY - 16);
    this.line.lineTo(this.playerX + 80, this.playerY - 46);
    this.line.strokePath();
  }

  private drawCharge() {
    this.chargeBar.clear();
    if (this.hookState !== 'charging') {
      return;
    }
    this.chargeBar.fillStyle(0x0e252d, 0.74);
    this.chargeBar.fillRoundedRect(this.playerX - 18, this.playerY - 80, 144, 12, 6);
    this.chargeBar.fillStyle(0xf4cf70, 1);
    this.chargeBar.fillRoundedRect(this.playerX - 18, this.playerY - 80, 144 * this.charge, 12, 6);
  }

  private updateHud() {
    const catches = Object.values(this.save.catchLog).reduce((sum, entry) => sum + entry.count, 0);
    const lineLoad = this.totalHookedWeight();
    const lineText = lineLoad > 0 ? `  |  Line ${lineLoad.toFixed(2)}/${this.rod.weightHandling} lb` : '';
    this.hud.setText(
      `$${this.save.money}  |  ${this.rod.displayName}  |  ${this.lure.displayName}  |  ${this.boat.displayName}  |  Catches ${catches}${lineText}`,
    );
    if (this.hookState === 'idle') {
      this.hint.setText('Arrow keys move boat. Hold mouse or Space to charge cast. S opens shop. R resets save.');
    } else if (this.hookState === 'charging') {
      this.hint.setText('Release to cast.');
    } else if (this.hookedFish.length > 0) {
      this.hint.setText('Hold to reel hooked fish all the way in. Too much weight snaps the line.');
    } else {
      this.hint.setText('Hold mouse or Space to reel. Release to let the lure sink.');
    }
  }

  private scheduleSpawn(delay?: number) {
    const [min, max] = this.level.spawnIntervalMs;
    this.nextSpawnAt = this.time.now + (delay ?? Phaser.Math.Between(min, max));
  }
}
