import Phaser from '../phaser.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, '빛을 깨우는 중...', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
