import Phaser from 'phaser';
import { levels } from '../data/levels';
import { SaveStore } from '../systems/save';
import type { LevelConfig } from '../types';

export class MapScene extends Phaser.Scene {
  private saveStore = new SaveStore();

  constructor() {
    super('Map');
  }

  create() {
    this.render();
    this.input.keyboard?.once('keydown-ESC', this.exitMap, this);
    this.input.keyboard?.once('keydown-M', this.exitMap, this);
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.render, this);
    });
  }

  private exitMap() {
    this.scene.resume('Lake');
    this.scene.stop();
  }

  private render() {
    const { width, height } = this.scale;
    const save = this.saveStore.reload();
    this.children.removeAll();
    this.add.rectangle(0, 0, width, height, 0x10232b).setOrigin(0);
    this.add.rectangle(0, 0, width, 86, 0x214d58).setOrigin(0);
    this.add.text(28, 24, 'Map', {
      color: '#f4fff8',
      fontSize: '28px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(28, 58, 'M or ESC returns to fishing', {
      color: '#b8d9d5',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
    });

    const columns = width < 760 ? 1 : 2;
    const cardWidth = columns === 1 ? width - 56 : (width - 82) / 2;
    levels.forEach((level, index) => {
      const x = 28 + (index % columns) * (cardWidth + 26);
      const y = 124 + Math.floor(index / columns) * 154;
      const unlocked = save.unlockedLevelIds.includes(level.id);
      this.renderLevel(level, x, y, cardWidth, unlocked, save.currentLevelId === level.id);
    });
  }

  private renderLevel(level: LevelConfig, x: number, y: number, width: number, unlocked: boolean, current: boolean) {
    const fill = current ? 0x2f665e : unlocked ? 0x203f47 : 0x11191d;
    const stroke = current ? 0xf4cf70 : unlocked ? 0x6fa7a3 : 0x3d4548;
    const card = this.add.rectangle(x, y, width, 122, fill, 0.96).setOrigin(0).setStrokeStyle(2, stroke, 0.85);
    const iconX = x + 60;
    const iconY = y + 61;
    this.add.circle(iconX, iconY, 39, unlocked ? level.palette.waterMid : 0x06090b, 1).setStrokeStyle(3, unlocked ? level.palette.waterTop : 0x252b2e, 1);
    this.add.text(iconX - 12, iconY - 17, `${level.levelNumber}`, {
      color: unlocked ? '#f4fff8' : '#4e5659',
      fontSize: '30px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(x + 122, y + 18, unlocked ? level.displayName : 'Locked', {
      color: unlocked ? '#f4fff8' : '#5e686b',
      fontSize: '22px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(x + 122, y + 50, unlocked ? level.subtitle : 'Buy a Ferry Ticket from the previous location.', {
      color: unlocked ? '#b8d9d5' : '#59666a',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: width - 148 },
    });
    this.add.text(x + 122, y + 82, current ? 'Current location' : unlocked ? 'Click to travel' : 'Blacked out', {
      color: current ? '#ffd66b' : unlocked ? '#d6ebe6' : '#485256',
      fontSize: '13px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    if (unlocked && !current) {
      card.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.saveStore.setCurrentLevel(level.id);
        this.scene.stop('Lake');
        this.scene.start('Lake');
        this.scene.stop();
      });
    }
  }
}
