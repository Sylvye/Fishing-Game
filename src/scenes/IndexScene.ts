import Phaser from 'phaser';
import { fishSpecies } from '../data/fish';
import { levelById } from '../data/levels';
import { getLevelSave, SaveStore } from '../systems/save';
import type { FishSpecies, PlayerLevelSave, PlayerSave } from '../types';

export class IndexScene extends Phaser.Scene {
  private saveStore = new SaveStore();
  private save!: PlayerSave;

  constructor() {
    super('Index');
  }

  create() {
    this.save = this.saveStore.reload();
    this.render();
    this.input.keyboard?.once('keydown-ESC', this.exitIndex, this);
    this.input.keyboard?.once('keydown-I', this.exitIndex, this);
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.render, this);
    });
  }

  private exitIndex() {
    this.scene.resume('Lake');
    this.scene.stop();
  }

  private render() {
    const { width, height } = this.scale;
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

    const columns = width < 860 ? 1 : 2;
    const columnWidth = columns === 1 ? width - 56 : (width - 82) / 2;
    const rowHeight = 128;
    fishSpecies.forEach((species, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      this.renderSpecies(species, 28 + column * (columnWidth + 26), 112 + row * rowHeight, columnWidth, levelSave);
    });
    if (level) {
      this.add.text(210, 31, `Level ${level.levelNumber}: ${level.displayName}`, {
        color: '#d6ebe6',
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
      });
    }
  }

  private renderSpecies(species: FishSpecies, x: number, y: number, width: number, levelSave: PlayerLevelSave) {
    const log = levelSave.catchLog[species.id];
    const caught = Boolean(log?.count);
    const fill = caught ? 0x203f47 : 0x1a3038;
    this.add.rectangle(x, y, width, 106, fill, 0.96).setOrigin(0).setStrokeStyle(1, caught ? 0x6fa7a3 : 0x415c62, 0.45);

    const image = this.add.image(x + 58, y + 53, species.assetId);
    image.setDisplaySize(88, 46);
    image.setAlpha(caught ? 0.96 : 1);
    if (!caught) {
      image.setTintFill(0x000000);
    }
    image.setFlipX(true);

    this.add.text(x + 118, y + 13, species.displayName, {
      color: '#f4fff8',
      fontSize: '17px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(x + 118, y + 36, species.scientificName, {
      color: '#9fc1bd',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(
      x + 118,
      y + 59,
      `Min ${species.minimumWeightLb} lb  |  Avg ${species.averageWeightLb} lb  |  Trophy ${species.trophyWeightLb} lb`,
      {
        color: '#d6ebe6',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
      },
    );
    this.add.text(x + 118, y + 80, this.indexLine(log), {
      color: caught ? '#ffd66b' : '#7f9898',
      fontSize: '12px',
      fontStyle: caught ? '700' : '400',
      fontFamily: 'Inter, sans-serif',
    });
  }

  private indexLine(log: PlayerLevelSave['catchLog'][string] | undefined) {
    if (!log) {
      return 'Not caught yet';
    }
    return `${log.count} caught  |  Best ${log.bestWeightLb.toFixed(2)} lb  |  Earned $${log.totalValue}`;
  }
}
