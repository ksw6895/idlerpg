export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
    this.gameScene = null;
    this.hearts = [];
    this.questText = null;
    this.promptText = null;
    this.dialoguePanel = null;
    this.dialogueText = null;
    this.dialogueSpeaker = null;
    this.dialogueQueue = [];
    this.dialogueLineIndex = 0;
    this.currentDialogue = null;
    this.isDialogueActive = false;
    this.systemText = null;
    this.questLogGroup = null;
    this.golemText = null;
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    const width = this.scale.width;
    const height = this.scale.height;

    const hudPanel = this.add.image(12, 12, 'ui-panel').setOrigin(0, 0).setScrollFactor(0);
    hudPanel.setScale(0.7, 0.9);

    this.questText = this.add.text(24, 28, '퀘스트: ', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '16px',
      color: '#e2f0ff',
      wordWrap: { width: 300 }
    }).setScrollFactor(0);

    this.golemText = this.add.text(24, 96, '', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '14px',
      color: '#9de1ff'
    }).setScrollFactor(0);

    this.createHeartHud(24, 70);

    this.promptText = this.add.text(width / 2, height - 60, '', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '18px',
      color: '#facc15'
    })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.dialoguePanel = this.add.rectangle(width / 2, height - 90, width - 80, 160, 0x0b1628, 0.82)
      .setStrokeStyle(2, 0x9de1ff, 0.6)
      .setScrollFactor(0)
      .setVisible(false);
    this.dialogueSpeaker = this.add.text(60, height - 160, '', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '18px',
      color: '#9de1ff'
    })
      .setScrollFactor(0)
      .setVisible(false);
    this.dialogueText = this.add.text(60, height - 130, '', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '18px',
      color: '#f4f4f4',
      wordWrap: { width: width - 140 }
    })
      .setScrollFactor(0)
      .setVisible(false);

    this.systemText = this.add.text(width / 2, 40, '', {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '18px',
      color: '#a7f3d0'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    this.questLogGroup = this.add.group();

    const instructions = [
      'WASD/방향키: 이동',
      'SHIFT: 달리기',
      'SPACE: 공격 / 대화 넘기기',
      'E: 상호작용',
      'P: 즉시 저장, L: 저장 불러오기'
    ];
    this.add.text(width - 280, 24, instructions.join('\n'), {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '14px',
      color: '#d1e9ff',
      align: 'right'
    })
      .setScrollFactor(0)
      .setAlpha(0.75);

    this.gameScene.events.on('hud-update', (data) => this.updateHud(data));
    this.gameScene.events.on('quest-update', (quest) => this.updateQuest(quest));
    this.gameScene.events.on('dialogue', (payload) => this.enqueueDialogue(payload));
    this.gameScene.events.on('interaction-available', (text) => this.updatePrompt(text));
    this.gameScene.events.on('system-message', (msg) => this.showSystemMessage(msg));
    this.gameScene.events.on('quest-log', (entry) => this.pushQuestLog(entry));

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.isDialogueActive) {
        this.advanceDialogue();
      }
    });
    this.input.keyboard.on('keydown-E', () => {
      if (this.isDialogueActive) {
        this.advanceDialogue();
      }
    });
  }

  createHeartHud(startX, startY) {
    const maxHearts = 12;
    this.hearts = [];
    for (let i = 0; i < maxHearts; i += 1) {
      const heart = this.add.image(startX + i * 26, startY, 'heart-empty').setScrollFactor(0);
      heart.setVisible(i < 12);
      this.hearts.push(heart);
    }
  }

  updateHud(data) {
    if (!data) return;
    for (let i = 0; i < this.hearts.length; i += 1) {
      const heart = this.hearts[i];
      if (!heart) continue;
      if (i < data.maxHp) {
        heart.setVisible(true);
        heart.setTexture(i < data.hp ? 'heart-full' : 'heart-empty');
      } else {
        heart.setVisible(false);
      }
    }

    if (this.golemText) {
      if (data.golemAlive && data.golemHp > 0) {
        this.golemText.setText(`코발트 골렘 HP: ${data.golemHp}/${this.gameScene?.golemState?.maxHp ?? data.golemHp}`);
        this.golemText.setVisible(true);
      } else {
        this.golemText.setVisible(false);
      }
    }
  }

  updateQuest(quest) {
    if (!quest) return;
    this.questText.setText(`퀘스트: ${quest.description}`);
  }

  updatePrompt(text) {
    if (text) {
      this.promptText.setText(text);
      this.promptText.setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }

  enqueueDialogue(payload) {
    if (!payload) return;
    this.dialogueQueue.push(payload);
    if (!this.isDialogueActive) {
      this.showNextDialogue();
    }
  }

  showNextDialogue() {
    if (this.dialogueQueue.length === 0) {
      this.hideDialogue();
      return;
    }
    this.currentDialogue = this.dialogueQueue.shift();
    this.dialogueLineIndex = 0;
    this.showDialogueLine();
  }

  showDialogueLine() {
    if (!this.currentDialogue) return;
    const lines = this.currentDialogue.lines || [];
    if (this.dialogueLineIndex >= lines.length) {
      this.showNextDialogue();
      return;
    }
    this.isDialogueActive = true;
    this.dialoguePanel.setVisible(true);
    this.dialogueSpeaker.setVisible(true).setText(this.currentDialogue.speaker || '');
    this.dialogueText.setVisible(true).setText(lines[this.dialogueLineIndex]);
  }

  advanceDialogue() {
    this.dialogueLineIndex += 1;
    this.showDialogueLine();
  }

  hideDialogue() {
    this.isDialogueActive = false;
    this.dialoguePanel.setVisible(false);
    this.dialogueSpeaker.setVisible(false);
    this.dialogueText.setVisible(false);
  }

  showSystemMessage(message) {
    if (!message) return;
    this.systemText.setText(message);
    this.systemText.setVisible(true);
    this.tweens.killTweensOf(this.systemText);
    this.systemText.setAlpha(1);
    this.tweens.add({
      targets: this.systemText,
      alpha: 0,
      duration: 2200,
      ease: 'Sine.easeOut',
      onComplete: () => this.systemText.setVisible(false)
    });
  }

  pushQuestLog(entry) {
    const label = this.add.text(this.scale.width - 260, this.scale.height - 200, entry, {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '14px',
      color: '#bef264',
      align: 'right',
      wordWrap: { width: 240 }
    }).setScrollFactor(0);
    label.setAlpha(0);
    this.questLogGroup.add(label);
    this.tweens.add({
      targets: label,
      alpha: 1,
      y: label.y - 30,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: label,
            alpha: 0,
            duration: 400,
            onComplete: () => label.destroy()
          });
        });
      }
    });
  }
}
