import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { DevConsoleScene } from './scenes/DevConsoleScene';
import { IndexScene } from './scenes/IndexScene';
import { LakeScene } from './scenes/LakeScene';
import { MapScene } from './scenes/MapScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ShopScene } from './scenes/ShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10232b',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, LakeScene, ShopScene, IndexScene, MapScene, DevConsoleScene],
};

new Phaser.Game(config);
