import Phaser from 'phaser';
import { assetManifest } from '../data/assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2, 'Loading fishing grounds...', {
      color: '#ecf8f4',
      fontFamily: 'Inter, sans-serif',
      fontSize: '22px',
    });
    label.setOrigin(0.5);

    for (const asset of assetManifest) {
      this.load.image(asset.id, asset.src);
      for (const variant of asset.variants ?? []) {
        this.load.image(variant.id, variant.src);
      }
    }
  }

  create() {
    this.scene.start('Lake');
  }
}
