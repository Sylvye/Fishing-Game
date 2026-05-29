import Phaser from 'phaser';
import { fishSpecies } from '../data/fish';
import { levelById } from '../data/levels';
import { getLevelSave, SaveStore } from '../systems/save';
import type { FishSpecies, PlayerLevelSave, PlayerSave } from '../types';

export class IndexScene extends Phaser.Scene {
  private saveStore = new SaveStore();
  private save!: PlayerSave;
  private scrollY = 0;
  private maxScrollY = 0;
  private viewportTop = 0;
  private viewportHeight = 0;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMaskGraphics?: Phaser.GameObjects.Graphics;
  private scrollThumb?: Phaser.GameObjects.Rectangle;
  private scrollDrag?: { pointerId: number; startPointerY: number; startScrollY: number };

  constructor() {
    super('Index');
  }

  create() {
    this.save = this.saveStore.reload();
    this.render();
    this.input.keyboard?.once('keydown-ESC', this.exitIndex, this);
    this.input.keyboard?.once('keydown-I', this.exitIndex, this);
    this.input.on('wheel', this.handleWheel, this);
    this.input.on('pointerdown', this.startScrollDrag, this);
    this.input.on('pointermove', this.updateScrollDrag, this);
    this.input.on('pointerup', this.stopScrollDrag, this);
    this.input.on('pointerupoutside', this.stopScrollDrag, this);
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('wheel', this.handleWheel, this);
      this.input.off('pointerdown', this.startScrollDrag, this);
      this.input.off('pointermove', this.updateScrollDrag, this);
      this.input.off('pointerup', this.stopScrollDrag, this);
      this.input.off('pointerupoutside', this.stopScrollDrag, this);
      this.scale.off('resize', this.render, this);
    });
  }

  private exitIndex() {
    this.scene.resume('Lake');
    this.scene.stop();
  }

  private render() {
    const { width, height } = this.scale;
    this.scrollMaskGraphics?.destroy();
    this.scrollMaskGraphics = undefined;
    this.children.removeAll();
    this.add.rectangle(0, 0, width, height, 0x10232b).setOrigin(0);
    this.add.rectangle(0, 0, width, 86, 0x285864).setOrigin(0);
    this.add.text(28, 24, 'Fish Index', {
      color: '#f4fff8',
      fontSize: '28px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(28, 58, 'I or ESC returns to the lake', {
      color: '#b8d9d5',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
    });

    const level = levelById.get(this.save.currentLevelId);
    const levelSave = getLevelSave(this.save);
    const totalCaught = Object.values(levelSave.catchLog).reduce((sum, entry) => sum + entry.count, 0);
    this.add.text(width - 250, 30, `Logged ${totalCaught}`, {
      color: '#ffd66b',
      fontSize: '22px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });

    const back = this.add.text(width - 96, 31, 'Back', {
      color: '#f4fff8',
      fontSize: '18px',
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#2b6871',
      padding: { x: 12, y: 7 },
    });
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.exitIndex());

    const viewportX = 28;
    this.viewportTop = 104;
    this.viewportHeight = Math.max(120, height - this.viewportTop - 24);
    const columns = width < 860 ? 1 : 2;
    const columnWidth = columns === 1 ? width - 56 : (width - 82) / 2;
    const rowHeight = 128;
    const sortedSpecies = [...fishSpecies].sort(
      (a, b) => a.averageWeightLb - b.averageWeightLb || a.displayName.localeCompare(b.displayName),
    );
    const rowCount = Math.ceil(sortedSpecies.length / columns);
    const contentHeight = rowCount * rowHeight - (rowHeight - 106) + 16;
    this.maxScrollY = Math.max(0, contentHeight - this.viewportHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);

    const scrollContainer = this.add.container(0, this.viewportTop - this.scrollY);
    this.scrollContainer = scrollContainer;
    this.scrollMaskGraphics = this.add.graphics().setVisible(false);
    this.scrollMaskGraphics.fillStyle(0xffffff);
    this.scrollMaskGraphics.fillRect(viewportX, this.viewportTop, width - 56, this.viewportHeight);
    scrollContainer.setMask(this.scrollMaskGraphics.createGeometryMask());

    sortedSpecies.forEach((species, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      this.renderSpecies(species, viewportX + column * (columnWidth + 26), row * rowHeight, columnWidth, levelSave, scrollContainer);
    });
    this.renderScrollBar(width);
    if (level) {
      this.add.text(210, 31, `Level ${level.levelNumber}: ${level.displayName}  |  Avg weight ↑`, {
        color: '#d6ebe6',
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
      });
    }
  }

  private renderSpecies(
    species: FishSpecies,
    x: number,
    y: number,
    width: number,
    levelSave: PlayerLevelSave,
    container: Phaser.GameObjects.Container,
  ) {
    const log = levelSave.catchLog[species.id];
    const caught = Boolean(log?.count);
    const fill = caught ? 0x203f47 : 0x1a3038;
    const card = this.add.rectangle(x, y, width, 106, fill, 0.96).setOrigin(0).setStrokeStyle(1, caught ? 0x6fa7a3 : 0x415c62, 0.45);

    const image = this.add.image(x + 58, y + 53, species.assetId);
    this.fitImageToBox(image, 88, 46);
    image.setAlpha(caught ? 0.96 : 1);
    if (!caught) {
      image.setTintFill(0x000000);
    }
    image.setFlipX(true);

    const name = this.add.text(x + 118, y + 13, caught ? species.displayName : this.obscureLetters(species.displayName), {
      color: '#f4fff8',
      fontSize: '17px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    const scientificName = this.add.text(x + 118, y + 36, caught ? species.scientificName : this.obscureLetters(species.scientificName), {
      color: '#9fc1bd',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
    });
    const weights = this.add.text(
      x + 118,
      y + 59,
      `Min ${species.minimumWeightLb} lb  |  Avg ${species.averageWeightLb} lb  |  Trophy ${species.trophyWeightLb} lb`,
      {
        color: '#d6ebe6',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
      },
    );
    const catchLine = this.add.text(x + 118, y + 80, this.indexLine(log), {
      color: caught ? '#ffd66b' : '#7f9898',
      fontSize: '12px',
      fontStyle: caught ? '700' : '400',
      fontFamily: 'Inter, sans-serif',
    });
    container.add([card, image, name, scientificName, weights, catchLine]);
  }

  private fitImageToBox(image: Phaser.GameObjects.Image, maxWidth: number, maxHeight: number) {
    const scale = Math.min(maxWidth / Math.max(1, image.width), maxHeight / Math.max(1, image.height));
    image.setScale(scale);
  }

  private handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
    _deltaZ: number,
  ) {
    if (!this.isPointerInViewport(pointer)) {
      return;
    }
    this.setScrollY(this.scrollY + deltaY);
  }

  private startScrollDrag(pointer: Phaser.Input.Pointer) {
    if (this.maxScrollY <= 0 || !this.isPointerInViewport(pointer)) {
      return;
    }
    this.scrollDrag = {
      pointerId: pointer.id,
      startPointerY: pointer.y,
      startScrollY: this.scrollY,
    };
  }

  private updateScrollDrag(pointer: Phaser.Input.Pointer) {
    if (!this.scrollDrag || pointer.id !== this.scrollDrag.pointerId || !pointer.isDown) {
      return;
    }
    this.setScrollY(this.scrollDrag.startScrollY + this.scrollDrag.startPointerY - pointer.y);
  }

  private stopScrollDrag(pointer: Phaser.Input.Pointer) {
    if (this.scrollDrag?.pointerId === pointer.id) {
      this.scrollDrag = undefined;
    }
  }

  private isPointerInViewport(pointer: Phaser.Input.Pointer) {
    const { width } = this.scale;
    return pointer.x >= 28 && pointer.x <= width - 28 && pointer.y >= this.viewportTop && pointer.y <= this.viewportTop + this.viewportHeight;
  }

  private setScrollY(value: number) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScrollY);
    this.scrollContainer?.setY(this.viewportTop - this.scrollY);
    this.updateScrollThumb();
  }

  private renderScrollBar(width: number) {
    if (this.maxScrollY <= 0) {
      this.scrollThumb = undefined;
      return;
    }
    const trackX = width - 17;
    this.add.rectangle(trackX, this.viewportTop, 4, this.viewportHeight, 0x27454e, 0.85).setOrigin(0.5, 0);
    const thumbHeight = Math.max(36, this.viewportHeight * (this.viewportHeight / (this.viewportHeight + this.maxScrollY)));
    this.scrollThumb = this.add.rectangle(trackX, this.viewportTop, 8, thumbHeight, 0xf4cf70, 0.92).setOrigin(0.5, 0);
    this.updateScrollThumb();
  }

  private updateScrollThumb() {
    if (!this.scrollThumb || this.maxScrollY <= 0) {
      return;
    }
    const trackTravel = this.viewportHeight - this.scrollThumb.displayHeight;
    this.scrollThumb.setY(this.viewportTop + (this.scrollY / this.maxScrollY) * trackTravel);
  }

  private obscureLetters(value: string) {
    return value.replace(/[A-Za-z]/g, '?');
  }

  private indexLine(log: PlayerLevelSave['catchLog'][string] | undefined) {
    if (!log) {
      return 'Not caught yet';
    }
    return `${log.count} caught  |  Best ${log.bestWeightLb.toFixed(2)} lb  |  Earned $${log.totalValue}`;
  }
}
