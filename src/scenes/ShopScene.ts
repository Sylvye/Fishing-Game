import Phaser from 'phaser';
import { buyOrEquipItem, getShopItems } from '../systems/economy';
import { SaveStore } from '../systems/save';
import type { PlayerSave, ShopItemKind, ShopItemView } from '../types';

export class ShopScene extends Phaser.Scene {
  private saveStore = new SaveStore();
  private save!: PlayerSave;

  constructor() {
    super('Shop');
  }

  create() {
    this.save = this.saveStore.reload();
    this.render();
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Lake'));
  }

  private render() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x14272e).setOrigin(0);
    this.add.rectangle(0, 0, width, 86, 0x1f4b55).setOrigin(0);
    this.add.text(28, 24, 'Tackle Shop', {
      color: '#f4fff8',
      fontSize: '28px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(width - 210, 30, `$${this.save.money}`, {
      color: '#ffd66b',
      fontSize: '24px',
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
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Lake'));

    const items = getShopItems(this.save);
    const columns: ShopItemKind[] = ['rod', 'lure', 'boat'];
    const labels: Record<ShopItemKind, string> = { rod: 'Rods', lure: 'Lures', boat: 'Boats' };
    const columnWidth = Math.min(330, (width - 80) / 3);

    columns.forEach((kind, columnIndex) => {
      const x = 28 + columnIndex * (columnWidth + 18);
      this.add.text(x, 112, labels[kind], {
        color: '#f4fff8',
        fontSize: '20px',
        fontStyle: '700',
        fontFamily: 'Inter, sans-serif',
      });
      items
        .filter((item) => item.kind === kind)
        .forEach((item, index) => this.renderItem(item, x, 150 + index * 116, columnWidth));
    });
  }

  private renderItem(item: ShopItemView, x: number, y: number, width: number) {
    const ownedLabel = item.equipped ? 'Equipped' : item.owned ? 'Equip' : `$${item.price}`;
    const canBuy = item.owned || this.save.money >= item.price;
    const fill = item.equipped ? 0x295f55 : 0x203a42;
    this.add.rectangle(x, y, width, 92, fill, 0.96).setOrigin(0).setStrokeStyle(1, 0x6fa7a3, 0.35);
    this.add.text(x + 14, y + 12, item.displayName, {
      color: '#f4fff8',
      fontSize: '17px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(x + 14, y + 39, item.detail, {
      color: '#a8c7c7',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: width - 112 },
    });

    const button = this.add.text(x + width - 92, y + 29, ownedLabel, {
      color: canBuy ? '#10232b' : '#26393d',
      backgroundColor: canBuy ? '#f4cf70' : '#9badad',
      fontSize: '14px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
      padding: { x: 10, y: 8 },
      fixedWidth: 76,
      align: 'center',
    });
    button.setInteractive({ useHandCursor: canBuy }).on('pointerdown', () => {
      if (!canBuy || item.equipped) {
        return;
      }
      this.save = this.saveStore.set(buyOrEquipItem(this.save, item.kind, item.id));
      this.scene.restart();
    });
  }
}
