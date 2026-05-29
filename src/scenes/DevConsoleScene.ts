import Phaser from 'phaser';
import { levelById } from '../data/levels';
import { applyDeveloperCommand, parseSceneDeveloperCommand } from '../systems/devConsole';
import { getLevelSave, SaveStore } from '../systems/save';
import type { SceneDeveloperCommand } from '../systems/devConsole';

interface FishDeveloperCommandTarget {
  applySceneDeveloperCommand(command: SceneDeveloperCommand): string;
}

export class DevConsoleScene extends Phaser.Scene {
  private readonly saveStore = new SaveStore();
  private inputText = '';
  private outputText = 'Type a command. Examples: money add 500, unlock all, debug, fish info';
  private commandHistory: string[] = [];
  private historyIndex?: number;
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
    const paddingX = 18;
    const outputWidth = Math.max(240, width - paddingX * 2);
    const panelHeight = 220;
    const save = this.saveStore.reload();
    const level = levelById.get(save.currentLevelId);
    const levelSave = getLevelSave(save);
    this.children.removeAll();

    this.add.rectangle(0, 0, width, panelHeight, 0x071116, 0.94).setOrigin(0).setStrokeStyle(2, 0xf4cf70, 0.85);
    this.add.text(paddingX, 14, 'Developer Console', {
      color: '#f4fff8',
      fontSize: '18px',
      fontStyle: '700',
      fontFamily: 'Inter, sans-serif',
    });
    this.add.text(paddingX, 42, `${level?.displayName ?? 'Current level'}  |  $${levelSave.money}  |  Grave accent or ESC closes`, {
      color: '#b8d9d5',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      wordWrap: { width: outputWidth },
    });
    this.commandLine = this.add.text(paddingX, 72, `> ${this.inputText}_`, {
      color: '#ffd66b',
      fontSize: '16px',
      fontFamily: 'Consolas, monospace',
      wordWrap: { width: outputWidth },
    });
    this.outputLine = this.add.text(paddingX, 108, this.outputText, {
      color: '#d6ebe6',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      lineSpacing: 3,
      wordWrap: { width: outputWidth },
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
    if (event.key === 'ArrowUp') {
      this.navigateHistory(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      this.navigateHistory(1);
      return;
    }
    if (event.key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
      this.historyIndex = undefined;
      this.updateLines();
      return;
    }
    if (event.key.length === 1 && this.inputText.length < 80) {
      this.inputText += event.key;
      this.historyIndex = undefined;
      this.updateLines();
    }
  }

  private executeCommand() {
    this.recordCommandHistory(this.inputText);
    const sceneCommand = parseSceneDeveloperCommand(this.inputText);
    if (sceneCommand.kind === 'error') {
      this.outputText = sceneCommand.message;
      this.inputText = '';
      this.render();
      return;
    }
    if (sceneCommand.kind === 'command') {
      const lake = this.scene.get('Lake') as Phaser.Scene & Partial<FishDeveloperCommandTarget>;
      this.outputText = lake.applySceneDeveloperCommand?.(sceneCommand.command) ?? 'Lake scene is not ready for scene commands.';
      this.inputText = '';
      this.render();
      return;
    }

    const result = applyDeveloperCommand(this.saveStore.reload(), this.inputText);
    this.saveStore.set(result.save);
    this.outputText = result.message;
    this.inputText = '';
    this.render();
  }

  private recordCommandHistory(command: string) {
    const trimmed = command.trim();
    this.historyIndex = undefined;
    if (!trimmed) {
      return;
    }
    if (this.commandHistory[this.commandHistory.length - 1] === trimmed) {
      return;
    }
    this.commandHistory.push(trimmed);
  }

  private navigateHistory(direction: -1 | 1) {
    if (this.commandHistory.length === 0) {
      return;
    }

    const nextIndex = this.historyIndex === undefined
      ? this.commandHistory.length - 1
      : this.historyIndex + direction;

    if (nextIndex < 0) {
      this.historyIndex = 0;
    } else if (nextIndex >= this.commandHistory.length) {
      this.historyIndex = undefined;
      this.inputText = '';
      this.updateLines();
      return;
    } else {
      this.historyIndex = nextIndex;
    }

    this.inputText = this.commandHistory[this.historyIndex];
    this.updateLines();
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
