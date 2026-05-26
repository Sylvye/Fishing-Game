import Phaser from 'phaser';
import { buyOrEquipItem, getShopItems } from '../systems/economy';
import { SaveStore } from '../systems/save';
import type { PlayerSave, ShopItemKind, ShopItemView } from '../types';

export class ShopScene extends Phaser.Scene {
  private saveStore = new SaveStore();
  private save!: PlayerSave;
  private tackleMode: 'lure' | 'bait' = 'lure';

  constructor() {
    super('Shop');
  }

  create() {
    this.save = this.saveStore.reload();
    this.render();
    this.input.keyboard?.once('keydown-ESC', this.exitShop, this);
    this.input.keyboard?.once('keydown-S', this.exitShop, this);
  }

  private exitShop() {
    this.scene.start('Lake');
  }

  private render() {
    const { width, height } = this.scale;
    this.children.removeAll();
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
    const columns: Array<ShopItemKind | 'tackle'> = ['rod', 'tackle', 'boat', 'chum'];
    const labels: Record<ShopItemKind | 'tackle', string> = {
      rod: 'Rods',
      lure: 'Lures',
      bait: 'Bait',
      tackle: 'Tackle',
      boat: 'Boats',
      chum: 'Chum',
    };
    const columnWidth = Math.min(280, (width - 104) / 4);

    columns.forEach((kind, columnIndex) => {
      const x = 28 + columnIndex * (columnWidth + 18);
      this.add.text(x, 112, labels[kind], {
        color: '#f4fff8',
        fontSize: '20px',
        fontStyle: '700',
        fontFamily: 'Inter, sans-serif',
      });
      if (kind === 'tackle') {
        this.renderTackleToggle(x, 111, columnWidth);
        items
          .filter((item) => item.kind === this.tackleMode)
          .forEach((item, index) => this.renderItem(item, x, 158 + index * 112, columnWidth));
        return;
      }
      items
        .filter((item) => item.kind === kind)
        .forEach((item, index) => this.renderItem(item, x, 150 + index * 112, columnWidth));
    });
  }

  private renderTackleToggle(x: number, y: number, width: number) {
    const buttonWidth = Math.max(76, Math.floor((width - 96) / 2));
    (['lure', 'bait'] as const).forEach((mode, index) => {
      const active = this.tackleMode === mode;
      const label = mode === 'lure' ? 'Lures' : 'Bait';
      const button = this.add.text(x + 70 + index * (buttonWidth + 8), y, label, {
        color: active ? '#10232b' : '#d6ebe6',
        backgroundColor: active ? '#f4cf70' : '#2b6871',
        fontSize: '13px',
        fontStyle: '700',
        fontFamily: 'Inter, sans-serif',
        padding: { x: 8, y: 6 },
        fixedWidth: buttonWidth,
        align: 'center',
      });
      button.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.tackleMode = mode;
        this.render();
      });
    });
  }

  private renderItem(item: ShopItemView, x: number, y: number, width: number) {
    const actionLabel = this.actionLabel(item);
    const canAct = this.canAct(item);
    const fill = item.equipped || item.active ? 0x295f55 : 0x203a42;
    this.add.rectangle(x, y, width, 96, fill, 0.96).setOrigin(0).setStrokeStyle(1, 0x6fa7a3, 0.35);
    this.add.text(x + 14, y + 12, item.displayName, {
      color: '#f4fff8',
      fontSize: '16px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(x + 14, y + 39, item.detail, {
      color: '#a8c7c7',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: width - 106 },
    });

    const button = this.add.text(x + width - 92, y + 31, actionLabel, {
      color: canAct ? '#10232b' : '#26393d',
      backgroundColor: canAct ? '#f4cf70' : '#9badad',
      fontSize: '14px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
      padding: { x: 10, y: 8 },
      fixedWidth: 76,
      align: 'center',
    });
    button.setInteractive({ useHandCursor: canAct }).on('pointerdown', () => {
      if (!canAct) {
        return;
      }
      this.save = this.saveStore.set(buyOrEquipItem(this.save, item.kind, item.id));
      this.render();
    });
  }

  private actionLabel(item: ShopItemView) {
    if (item.kind === 'bait') {
      if (item.equipped) {
        return `Buy $${item.price}`;
      }
      return item.owned ? 'Equip' : `$${item.price}`;
    }
    if (item.kind === 'chum') {
      return item.active ? 'Active' : `$${item.price}`;
    }
    return item.equipped ? 'Equipped' : item.owned ? 'Equip' : `$${item.price}`;
  }

  private canAct(item: ShopItemView) {
    if (item.kind === 'bait') {
      return item.owned && !item.equipped ? true : this.save.money >= item.price;
    }
    if (item.kind === 'chum') {
      return !item.active && this.save.money >= item.price;
    }
    return !item.equipped && (item.owned || this.save.money >= item.price);
  }
}
