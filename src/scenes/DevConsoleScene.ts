import Phaser from 'phaser';
import { levelById } from '../data/levels';
import { applyDeveloperCommand } from '../systems/devConsole';
import { getLevelSave, SaveStore } from '../systems/save';

export class DevConsoleScene extends Phaser.Scene {
  private readonly saveStore = new SaveStore();
  private inputText = '';
  private outputText = 'Type a command. Example: money add 500';
  private commandLine?: Phaser.GameObjects.Text;
  private outputLine?: Phaser.GameObjects.Text;
  private keyHandler?: (event: KeyboardEvent) => void;
  private ignoreGraveUntil = 0;

  constructor() {
    super('DevConsole');
  }

  create() {
    this.ignoreGraveUntil = this.time.now + 120;
    this.render();
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) {
        this.input.keyboard?.off('keydown', this.keyHandler);
      }
    });
  }

  private render() {
    const { width } = this.scale;
    const save = this.saveStore.reload();
    const level = levelById.get(save.currentLevelId);
    const levelSave = getLevelSave(save);
    this.children.removeAll();

    this.add.rectangle(0, 0, width, 132, 0x071116, 0.94).setOrigin(0).setStrokeStyle(2, 0xf4cf70, 0.85);
    this.add.text(18, 14, 'Developer Console', {
      color: '#f4fff8',
      fontSize: '18px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(18, 42, `${level?.displayName ?? 'Current level'}  |  $${levelSave.money}  |  Grave accent or ESC closes`, {
      color: '#b8d9d5',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
    });
    this.commandLine = this.add.text(18, 72, `> ${this.inputText}_`, {
      color: '#ffd66b',
      fontSize: '16px',
      fontFamily: 'Consolas, monospace',
    });
    this.outputLine = this.add.text(18, 102, this.outputText, {
      color: '#d6ebe6',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
    });
  }

  private handleKey(event: KeyboardEvent) {
    event.preventDefault();
    if (event.key === '`' && this.time.now < this.ignoreGraveUntil) {
      return;
    }
    if (event.key === 'Escape' || event.key === '`') {
      this.exitConsole();
      return;
    }
    if (event.key === 'Enter') {
      this.executeCommand();
      return;
    }
    if (event.key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
      this.updateLines();
      return;
    }
    if (event.key.length === 1 && this.inputText.length < 80) {
      this.inputText += event.key;
      this.updateLines();
    }
  }

  private executeCommand() {
    const result = applyDeveloperCommand(this.saveStore.reload(), this.inputText);
    this.saveStore.set(result.save);
    this.outputText = result.message;
    this.inputText = '';
    this.render();
  }

  private updateLines() {
    this.commandLine?.setText(`> ${this.inputText}_`);
    this.outputLine?.setText(this.outputText);
  }

  private exitConsole() {
    this.scene.resume('Lake');
    this.scene.stop();
  }
}
