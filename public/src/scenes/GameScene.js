import Phaser from '../phaser.js';
import { setupInput, getMovementVector } from '../systems/input.js';
import { applyYDepthSort, setDepthByY } from '../systems/depth.js';
import { loadGame, saveGame } from '../systems/save.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.mapData = null;
    this.tileSize = 32;
    this.player = null;
    this.playerStats = null;
    this.inventory = null;
    this.quest = null;
    this.inputKeys = null;
    this.entityLayer = null;
    this.overlayLayer = null;
    this.backgroundLayer = null;
    this.blockedGroup = null;
    this.interactables = [];
    this.closestInteractable = null;
    this.storyBeacons = [];
    this.worldFlags = null;
    this.roofs = [];
    this.fairy = null;
    this.golem = null;
    this.golemState = null;
    this.seedItem = null;
    this.pendingLoad = null;
  }

  create() {
    this.mapData = this.cache.json.get('map');
    this.tileSize = this.mapData.tileSize || 32;
    this.backgroundLayer = this.add.layer();
    this.entityLayer = this.add.layer();
    this.overlayLayer = this.add.layer();
    this.blockedGroup = this.physics.add.staticGroup();
    this.interactables = [];
    this.storyBeacons = this.mapData.storyBeacons.map((beacon) => ({ ...beacon, triggered: false }));

    this.worldFlags = {
      golemDefeated: false,
      seedCollected: false,
      loreStoneRead: false,
      pondVisited: false,
      groveAwakened: false
    };

    this.inventory = {
      hasSeed: false
    };

    this.quest = {
      stage: 'intro',
      description: '엘다 린 장로와 대화하세요.',
      log: []
    };

    this.playerStats = {
      maxHp: 8,
      hp: 8,
      attack: 2,
      direction: 'down',
      speed: 180,
      attackCooldown: 0,
      invulnerableTime: 0
    };

    const saved = loadGame();
    if (saved) {
      this.pendingLoad = saved;
      this.quest.stage = saved.quest?.stage ?? this.quest.stage;
      this.quest.description = this.getQuestDescription(this.quest.stage);
      this.inventory.hasSeed = saved.inventory?.hasSeed ?? false;
      this.worldFlags = {
        golemDefeated: saved.world?.golemDefeated ?? false,
        seedCollected: saved.world?.seedCollected ?? false,
        loreStoneRead: saved.world?.loreStoneRead ?? false,
        pondVisited: saved.world?.pondVisited ?? false,
        groveAwakened: saved.world?.groveAwakened ?? false
      };
      this.playerStats.hp = saved.player?.hp ?? this.playerStats.hp;
      this.playerStats.direction = saved.player?.direction ?? this.playerStats.direction;
    }

    this.createTerrain();
    this.createDecorations();
    this.createStructures();
    this.createActors();
    this.createSystems();

    this.scene.launch('UIScene');
    this.events.emit('hud-update', this.getHudPayload());
    this.events.emit('quest-update', this.getQuestStatus());

    if (saved) {
      this.events.emit('dialogue', {
        speaker: '시스템',
        lines: ['이전에 저장된 모험에서 이어 플레이합니다.']
      });
    } else {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: [
          '아린, 루민트리의 숨이 가빠지고 있다.',
          '씨앗을 되찾아야만 계곡에 아침이 찾아올 것이다. 나와 이야기해 주겠나?'
        ]
      });
    }
  }

  createSystems() {
    const worldWidth = this.mapData.width * this.tileSize;
    const worldHeight = this.mapData.height * this.tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    this.inputKeys = setupInput(this);

    this.physics.add.collider(this.player, this.blockedGroup);
    if (this.golem) {
      this.physics.add.collider(this.player, this.golem);
      this.physics.add.collider(this.golem, this.blockedGroup);
    }
    if (this.seedItem) {
      this.physics.add.overlap(this.player, this.seedItem, () => this.collectSeed(), null, this);
    }

    this.input.keyboard.on('keydown-P', () => {
      const success = this.persistState();
      this.events.emit('system-message', success ? '진행도가 저장되었습니다.' : '저장에 실패했습니다.');
    });

    this.input.keyboard.on('keydown-L', () => {
      const loaded = loadGame();
      if (loaded) {
        this.loadFromState(loaded);
        this.events.emit('system-message', '세이브를 불러왔습니다.');
      } else {
        this.events.emit('system-message', '불러올 세이브가 없습니다.');
      }
    });

    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        this.events.emit('hud-update', this.getHudPayload());
      }
    });
  }

  createTerrain() {
    const { tiles, blockedTiles, width, height } = this.mapData;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tileId = tiles[y][x];
        const texture = this.getTileTexture(tileId);
        const worldX = x * this.tileSize + this.tileSize / 2;
        const worldY = y * this.tileSize + this.tileSize / 2;
        const tileSprite = this.add.image(worldX, worldY, texture);
        tileSprite.setOrigin(0.5);
        tileSprite.setDepth(worldY - 32);
        this.backgroundLayer.add(tileSprite);

        if (blockedTiles.includes(tileId)) {
          const collider = this.blockedGroup.create(worldX, worldY, 'collision-tile');
          collider.setAlpha(0.001);
          collider.refreshBody();
          collider.body.setSize(this.tileSize * 0.9, this.tileSize * 0.9);
        }
      }
    }
  }

  createDecorations() {
    this.mapData.decorations.forEach((deco) => {
      const worldX = (deco.x + 0.5) * this.tileSize;
      const worldY = (deco.y + 1) * this.tileSize;
      if (deco.type === 'tree') {
        const trunk = this.add.image(worldX, worldY, 'tree-trunk');
        trunk.setOrigin(0.5, 1);
        this.entityLayer.add(trunk);
        setDepthByY(trunk);
        const canopy = this.add.image(worldX, worldY - 40, 'tree-canopy');
        canopy.setOrigin(0.5, 0.6);
        canopy.setDepth(worldY + 80);
        this.overlayLayer.add(canopy);

        const collider = this.blockedGroup.create(worldX, worldY - 12, 'collision-tile');
        collider.setAlpha(0.001);
        collider.body.setSize(this.tileSize * 0.7, this.tileSize * 0.5);
        collider.body.updateFromGameObject();
      }
    });
  }

  createStructures() {
    this.roofs = [];
    this.mapData.structures.forEach((structure) => {
      const baseX = (structure.x + structure.width / 2) * this.tileSize;
      const baseY = (structure.y + structure.height) * this.tileSize;
      if (structure.type === 'house') {
        const roof = this.add.image(baseX, baseY - this.tileSize * 0.5, 'house-roof');
        roof.setOrigin(0.5, 1);
        roof.setDepth(baseY + 120);
        this.overlayLayer.add(roof);
        this.roofs.push({ sprite: roof, area: new Phaser.Geom.Rectangle(structure.x, structure.y, structure.width, structure.height) });

        // doorway collider for inner walls
        for (let y = 0; y < structure.height; y += 1) {
          for (let x = 0; x < structure.width; x += 1) {
            if (y === structure.height - 1 && x === Math.floor(structure.width / 2)) continue;
            if (y === structure.height - 1) {
              const collider = this.blockedGroup.create((structure.x + x + 0.5) * this.tileSize, (structure.y + y + 0.6) * this.tileSize, 'collision-tile');
              collider.setAlpha(0.001);
              collider.body.setSize(this.tileSize * 0.9, this.tileSize * 0.4);
            }
          }
        }
      } else if (structure.type === 'arch') {
        const arch = this.add.image(baseX, (structure.y + 0.5) * this.tileSize, 'stone-arch');
        arch.setOrigin(0.5, 1);
        arch.setDepth(baseY + 100);
        this.overlayLayer.add(arch);
      }
    });
  }

  createActors() {
    const spawn = this.mapData.spawnPoints;
    const playerSpawn = this.pendingLoad?.player
      ? { x: this.pendingLoad.player.x, y: this.pendingLoad.player.y }
      : { x: (spawn.player[0] + 0.5) * this.tileSize, y: (spawn.player[1] + 0.5) * this.tileSize };

    this.player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, `hero-${this.playerStats.direction}-1`);
    this.player.setSize(16, 20);
    this.player.setOffset(4, 12);
    this.entityLayer.add(this.player);
    setDepthByY(this.player);

    const elderPos = { x: (spawn.elder[0] + 0.5) * this.tileSize, y: (spawn.elder[1] + 0.8) * this.tileSize };
    const elder = this.add.sprite(elderPos.x, elderPos.y, 'elder');
    elder.setOrigin(0.5, 1);
    this.entityLayer.add(elder);
    setDepthByY(elder);
    this.registerInteractable({
      id: 'elder',
      sprite: elder,
      radius: 60,
      prompt: 'E - 엘다 린과 대화',
      action: () => this.talkToElder()
    });

    const lorePos = { x: (spawn.loreStone[0] + 0.5) * this.tileSize, y: (spawn.loreStone[1] + 0.8) * this.tileSize };
    const lore = this.add.sprite(lorePos.x, lorePos.y, 'lore-stone');
    lore.setOrigin(0.5, 1);
    this.entityLayer.add(lore);
    setDepthByY(lore);
    this.registerInteractable({
      id: 'lore',
      sprite: lore,
      radius: 50,
      prompt: 'E - 고대 석판 조사',
      action: () => this.inspectLoreStone()
    });

    this.fairy = this.add.sprite(elderPos.x + 20, elderPos.y - 40, 'fairy');
    this.fairy.setOrigin(0.5, 0.5);
    this.overlayLayer.add(this.fairy);
    this.tweens.add({
      targets: this.fairy,
      y: this.fairy.y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const golemPos = { x: (spawn.golem[0] + 0.5) * this.tileSize, y: (spawn.golem[1] + 0.5) * this.tileSize };
    this.golem = this.physics.add.sprite(golemPos.x, golemPos.y, 'golem-0');
    this.golem.setSize(22, 24);
    this.golem.setOffset(5, 10);
    this.golemState = {
      maxHp: 14,
      hp: 14,
      awake: false,
      attackCooldown: 0
    };
    this.golem.play('golem-walk');
    this.entityLayer.add(this.golem);
    setDepthByY(this.golem);

    if (this.worldFlags.golemDefeated) {
      this.golem.disableBody(true, true);
    }

    this.seedItem = this.physics.add.sprite(
      (spawn.seed[0] + 0.5) * this.tileSize,
      (spawn.seed[1] + 0.5) * this.tileSize,
      'lumin-seed'
    );
    this.seedItem.setVisible(false);
    this.seedItem.body.setAllowGravity(false);
    this.seedItem.body.setSize(16, 20);
    this.overlayLayer.add(this.seedItem);

    if (this.worldFlags.seedCollected || this.inventory.hasSeed) {
      this.seedItem.disableBody(true, true);
      this.inventory.hasSeed = true;
    }

    if (this.pendingLoad) {
      this.loadFromState(this.pendingLoad);
      this.pendingLoad = null;
    }
  }

  registerInteractable(config) {
    this.interactables.push(config);
  }

  inspectLoreStone() {
    if (this.worldFlags.loreStoneRead) {
      this.events.emit('dialogue', {
        speaker: '고대 석판',
        lines: ['빛은 그림자와 맞닿을 때 더욱 찬란해진다. 이미 기록을 읽었습니다.']
      });
      return;
    }
    this.worldFlags.loreStoneRead = true;
    this.events.emit('dialogue', {
      speaker: '고대 석판',
      lines: [
        '"루민트리가 약해지면 숲의 수호자는 잠에서 깨어난다."',
        '"그러나 빛의 맥을 되돌린 자만이 그를 잠재울 수 있다."'
      ]
    });
    this.questLog('고대 석판에서 루민 씨앗을 안정시키는 주문을 배웠다.');
    this.persistState();
  }

  talkToElder() {
    if (this.quest.stage === 'intro') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: [
          '아린, 연못에 남은 빛의 자취를 따라가 보게. 그곳에서 씨앗의 흔적을 찾을 수 있을 게다.',
          '준비가 되었다면 북쪽의 연못을 조사하거라. 나는 루민트리 곁에서 기도를 이어가마.'
        ]
      });
      this.advanceQuest('accepted');
    } else if (this.quest.stage === 'accepted') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: ['연못에서 빛의 잔향을 찾아오게. 그 속삭임이 길을 열어줄 것이다.']
      });
    } else if (this.quest.stage === 'attuned') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: ['연못이 알려준 길을 따라 제단으로 가보게. 그림자 골렘을 조심하라네.']
      });
    } else if (this.quest.stage === 'battle') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: ['골렘에게서 씨앗을 되찾거라. 노바가 길을 밝혀 줄 것이다!']
      });
    } else if (this.quest.stage === 'seedFound') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: [
          '이 빛나는 기운은… 루민 씨앗이군! 잘 해냈다, 아린.',
          '씨앗을 제단에 봉헌하면 계곡에 새벽이 찾아올 것이다. 네가 진정한 수호자다.'
        ]
      });
      this.advanceQuest('completed');
      this.worldFlags.groveAwakened = true;
      this.persistState();
    } else if (this.quest.stage === 'completed') {
      this.events.emit('dialogue', {
        speaker: '엘다 린',
        lines: ['이제 계곡은 다시 숨을 고르게 되었구나. 자네의 모험은 이제 시작일세.']
      });
    }
  }

  getQuestDescription(stage) {
    switch (stage) {
      case 'intro':
        return '엘다 린 장로와 대화하세요.';
      case 'accepted':
        return '북쪽의 고요한 연못을 조사하세요.';
      case 'attuned':
        return '연못의 속삭임을 따라 제단으로 이동하세요.';
      case 'battle':
        return '코발트 골렘을 제압하고 루민 씨앗을 되찾으세요.';
      case 'seedFound':
        return '루민 씨앗을 엘다 린에게 전달하세요.';
      case 'completed':
        return '루민트리가 다시 빛나고 있습니다. 축하합니다!';
      default:
        return '모험을 이어가세요.';
    }
  }

  advanceQuest(newStage) {
    this.quest.stage = newStage;
    this.quest.description = this.getQuestDescription(newStage);
    this.events.emit('quest-update', this.getQuestStatus());
    this.persistState();
  }

  questLog(entry) {
    this.quest.log.push({ text: entry, time: Date.now() });
    this.events.emit('quest-log', entry);
  }

  loadFromState(state) {
    if (!state) return;
    if (this.player) {
      this.player.setPosition(state.player?.x ?? this.player.x, state.player?.y ?? this.player.y);
      this.playerStats.hp = Phaser.Math.Clamp(state.player?.hp ?? this.playerStats.hp, 0, this.playerStats.maxHp);
      this.playerStats.direction = state.player?.direction ?? this.playerStats.direction;
    }
    this.inventory.hasSeed = state.inventory?.hasSeed ?? this.inventory.hasSeed;
    this.quest.stage = state.quest?.stage ?? this.quest.stage;
    this.quest.description = this.getQuestDescription(this.quest.stage);
    this.worldFlags = {
      golemDefeated: state.world?.golemDefeated ?? this.worldFlags.golemDefeated,
      seedCollected: state.world?.seedCollected ?? this.worldFlags.seedCollected,
      loreStoneRead: state.world?.loreStoneRead ?? this.worldFlags.loreStoneRead,
      pondVisited: state.world?.pondVisited ?? this.worldFlags.pondVisited,
      groveAwakened: state.world?.groveAwakened ?? this.worldFlags.groveAwakened
    };

    if (this.golem) {
      if (this.worldFlags.golemDefeated) {
        this.golem.disableBody(true, true);
        this.golemState.awake = false;
      } else {
        this.golem.enableBody(true, this.golem.x, this.golem.y, true, true);
        this.golemState.awake = this.quest.stage === 'battle' || this.quest.stage === 'seedFound';
        if (typeof state.world?.golemHp === 'number') {
          this.golemState.hp = state.world.golemHp;
        }
      }
    }

    if (this.seedItem) {
      if (this.inventory.hasSeed || this.worldFlags.seedCollected) {
        this.seedItem.disableBody(true, true);
      } else {
        const spawn = this.mapData.spawnPoints.seed;
        const defaultX = (spawn[0] + 0.5) * this.tileSize;
        const defaultY = (spawn[1] + 0.5) * this.tileSize;
        this.seedItem.enableBody(true, defaultX, defaultY, true, true);
        this.seedItem.setVisible(true);
        this.seedItem.setVelocity(0, 0);
        this.seedItem.setGravityY(0);
        this.startSeedHover();
      }
    }

    this.events.emit('hud-update', this.getHudPayload());
    this.events.emit('quest-update', this.getQuestStatus());
  }

  persistState() {
    const payload = {
      player: {
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
        hp: this.playerStats.hp,
        direction: this.playerStats.direction
      },
      quest: {
        stage: this.quest.stage
      },
      inventory: {
        hasSeed: this.inventory.hasSeed
      },
      world: { ...this.worldFlags, golemHp: this.golemState?.hp ?? 0 },
      timestamp: Date.now()
    };
    return saveGame(payload);
  }

  getHudPayload() {
    return {
      hp: this.playerStats.hp,
      maxHp: this.playerStats.maxHp,
      attack: this.playerStats.attack,
      questStage: this.quest.stage,
      hasSeed: this.inventory.hasSeed,
      golemHp: this.golemState?.hp,
      golemAlive: this.golem?.active
    };
  }

  getQuestStatus() {
    return {
      stage: this.quest.stage,
      description: this.quest.description
    };
  }

  update(time, delta) {
    if (!this.player) return;
    const dt = delta;
    this.updatePlayer(dt);
    this.updateGolem(dt);
    this.updateFairy(dt);
    this.updateRoofs();
    this.updateInteractions();
    this.updateBeacons();
    applyYDepthSort(this.entityLayer);
  }

  updatePlayer(delta) {
    const vector = getMovementVector(this.inputKeys.cursors, this.inputKeys.keys);
    const speed = this.playerStats.speed * (this.inputKeys.keys.SHIFT.isDown ? 1.2 : 1);
    const vx = vector.x * speed;
    const vy = vector.y * speed;
    this.player.setVelocity(vx, vy);

    if (vector.lengthSq() > 0) {
      const absX = Math.abs(vector.x);
      const absY = Math.abs(vector.y);
      if (absX > absY) {
        this.playerStats.direction = vector.x > 0 ? 'right' : 'left';
      } else {
        this.playerStats.direction = vector.y > 0 ? 'down' : 'up';
      }
      this.player.play(`hero-walk-${this.playerStats.direction}`, true);
    } else {
      this.player.setVelocity(0, 0);
      this.player.play(`hero-idle-${this.playerStats.direction}`, true);
    }

    if (this.playerStats.attackCooldown > 0) {
      this.playerStats.attackCooldown -= delta;
    }
    if (this.playerStats.invulnerableTime > 0) {
      this.playerStats.invulnerableTime -= delta;
      this.player.setAlpha(0.6 + 0.4 * Math.sin(this.time.now / 60));
      if (this.playerStats.invulnerableTime <= 0) {
        this.player.setAlpha(1);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.keys.SPACE)) {
      this.performAttack();
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 16, this.mapData.width * this.tileSize - 16);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, this.mapData.height * this.tileSize - 16);
    setDepthByY(this.player);
  }

  performAttack() {
    if (this.playerStats.attackCooldown > 0) return;
    this.playerStats.attackCooldown = 360;
    const dir = this.playerStats.direction;
    const offset = new Phaser.Math.Vector2(0, 0);
    let angle = 0;
    if (dir === 'left') {
      offset.x = -20;
      angle = 180;
    } else if (dir === 'right') {
      offset.x = 20;
      angle = 0;
    } else if (dir === 'up') {
      offset.y = -20;
      angle = -90;
    } else {
      offset.y = 20;
      angle = 90;
    }

    const slash = this.add.sprite(this.player.x + offset.x, this.player.y + offset.y, 'slash');
    slash.setDepth(this.player.y + 10);
    slash.setAngle(angle);
    this.time.delayedCall(140, () => slash.destroy());

    const hitBox = new Phaser.Geom.Rectangle(
      this.player.x + offset.x - 20,
      this.player.y + offset.y - 20,
      40,
      40
    );

    if (this.golem && this.golem.active && Phaser.Geom.Intersects.RectangleToRectangle(hitBox, this.golem.getBounds())) {
      this.damageGolem(this.playerStats.attack);
    }
  }

  damageGolem(amount) {
    if (!this.golemState || !this.golem || !this.golem.active) return;
    this.golemState.hp = Math.max(0, this.golemState.hp - amount);
    this.spawnFloatingText(this.golem.x, this.golem.y - 24, `-${amount}`, '#9de1ff');
    this.events.emit('hud-update', this.getHudPayload());
    this.tweens.add({
      targets: this.golem,
      tint: { from: 0xffffff, to: 0x9de1ff },
      duration: 120,
      yoyo: true
    });
    if (this.golemState.hp <= 0) {
      this.defeatGolem();
    }
  }

  defeatGolem() {
    if (!this.golem) return;
    this.spawnFloatingText(this.golem.x, this.golem.y - 20, '코발트 골렘 진정!', '#fbbf24');
    this.golem.disableBody(true, true);
    this.worldFlags.golemDefeated = true;
    this.golemState.awake = false;
    this.events.emit('dialogue', {
      speaker: '노바',
      lines: ['빛이 다시 숨을 쉬고 있어요! 씨앗이 이 근처에 떨어졌어요. 찾아봐요!']
    });
    this.questLog('코발트 골렘을 진정시키고 루민 씨앗이 드러났다.');
    this.seedItem.enableBody(true, this.golem.x, this.golem.y, true, true);
    this.seedItem.setVisible(true);
    this.seedItem.setVelocity(0, -40);
    this.seedItem.setGravityY(0);
    this.startSeedHover();
    this.advanceQuest('seedFound');
    this.persistState();
  }

  collectSeed() {
    if (!this.seedItem.active) return;
    this.tweens.killTweensOf(this.seedItem);
    this.seedItem.disableBody(true, true);
    this.inventory.hasSeed = true;
    this.worldFlags.seedCollected = true;
    this.spawnFloatingText(this.player.x, this.player.y - 20, '루민 씨앗을 손에 넣었다!', '#a7f3d0');
    this.events.emit('system-message', '루민 씨앗을 손에 넣었습니다. 엘다 린에게 돌아가세요.');
    this.persistState();
  }

  updateGolem(delta) {
    if (!this.golem || !this.golem.active) return;
    if (!this.golemState.awake) return;
    const speed = 70;
    const angle = Phaser.Math.Angle.Between(this.golem.x, this.golem.y, this.player.x, this.player.y);
    this.physics.velocityFromRotation(angle, speed, this.golem.body.velocity);
    setDepthByY(this.golem);

    if (this.golemState.attackCooldown > 0) {
      this.golemState.attackCooldown -= delta;
    }

    const distance = Phaser.Math.Distance.Between(this.golem.x, this.golem.y, this.player.x, this.player.y);
    if (distance < 36 && this.golemState.attackCooldown <= 0) {
      this.golemState.attackCooldown = 1200;
      this.attackPlayer(2);
    }
  }

  attackPlayer(damage) {
    if (this.playerStats.invulnerableTime > 0) return;
    this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
    this.playerStats.invulnerableTime = 800;
    this.spawnFloatingText(this.player.x, this.player.y - 24, `-${damage}`, '#f87171');
    this.events.emit('hud-update', this.getHudPayload());
    if (this.playerStats.hp <= 0) {
      this.handlePlayerDefeat();
    }
  }

  handlePlayerDefeat() {
    this.playerStats.hp = this.playerStats.maxHp;
    const spawn = this.mapData.spawnPoints.player;
    this.player.setPosition((spawn[0] + 0.5) * this.tileSize, (spawn[1] + 0.5) * this.tileSize);
    this.playerStats.invulnerableTime = 1200;
    this.events.emit('dialogue', {
      speaker: '노바',
      lines: ['아린! 아직 포기할 수 없어요. 다시 일어나요!']
    });
    this.events.emit('hud-update', this.getHudPayload());
  }

  updateFairy() {
    if (!this.fairy || !this.player) return;
    const targetX = this.player.x + 30;
    const targetY = this.player.y - 40;
    this.fairy.x = Phaser.Math.Linear(this.fairy.x, targetX, 0.08);
    this.fairy.y = Phaser.Math.Linear(this.fairy.y, targetY, 0.08);
    this.fairy.setDepth(this.player.y + 60);
  }

  updateRoofs() {
    this.roofs.forEach((roofInfo) => {
      const { sprite, area } = roofInfo;
      if (!sprite) return;
      const inside = this.isInsideArea(this.player, area);
      sprite.setAlpha(inside ? 0.35 : 1);
    });
  }

  isInsideArea(gameObject, area) {
    const tileX = gameObject.x / this.tileSize;
    const tileY = gameObject.y / this.tileSize;
    return tileX >= area.x && tileX <= area.x + area.width && tileY >= area.y && tileY <= area.y + area.height;
  }

  updateInteractions() {
    this.closestInteractable = null;
    let minDistance = Number.MAX_VALUE;
    this.interactables.forEach((interact) => {
      if (!interact.sprite || !interact.sprite.active) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, interact.sprite.x, interact.sprite.y);
      if (distance < interact.radius && distance < minDistance) {
        minDistance = distance;
        this.closestInteractable = interact;
      }
    });

    if (this.closestInteractable) {
      this.events.emit('interaction-available', this.closestInteractable.prompt);
      if (Phaser.Input.Keyboard.JustDown(this.inputKeys.keys.E)) {
        this.closestInteractable.action();
      }
    } else {
      this.events.emit('interaction-available', null);
    }
  }

  updateBeacons() {
    this.storyBeacons.forEach((beacon) => {
      if (beacon.triggered) return;
      const dx = this.player.x / this.tileSize - beacon.x;
      const dy = this.player.y / this.tileSize - beacon.y;
      if (Math.sqrt(dx * dx + dy * dy) <= beacon.radius + 0.5) {
        beacon.triggered = true;
        this.handleBeacon(beacon.id);
      }
    });
  }

  handleBeacon(id) {
    if (id === 'pond') {
      if (this.quest.stage === 'accepted' && !this.worldFlags.pondVisited) {
        this.worldFlags.pondVisited = true;
        this.events.emit('dialogue', {
          speaker: '노바',
          lines: ['연못이 빛나는 흔적을 보여줘요! 이 힘으로 제단의 봉인을 열 수 있을 거예요.']
        });
        this.questLog('고요한 연못에서 빛의 잔향을 얻었다.');
        this.advanceQuest('attuned');
      }
    } else if (id === 'groveEntrance') {
      if (this.quest.stage === 'attuned' && !this.golemState.awake) {
        this.worldFlags.groveAwakened = true;
        this.events.emit('dialogue', {
          speaker: '코발트 골렘',
          lines: ['빛의 사슬이 다시 나를 묶으려 하는가… 하지만 이곳은 이제 내 영역이다!']
        });
        this.questLog('코발트 골렘이 깨어났다. 전투에 대비하자.');
        this.startGolemBattle();
      }
    }
  }

  startGolemBattle() {
    this.golemState.awake = true;
    this.advanceQuest('battle');
    this.persistState();
  }

  startSeedHover() {
    if (!this.seedItem) return;
    this.tweens.killTweensOf(this.seedItem);
    this.tweens.add({
      targets: this.seedItem,
      y: this.seedItem.y - 8,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  spawnFloatingText(x, y, text, color = '#ffffff') {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: '12px',
      color
    });
    label.setOrigin(0.5, 1);
    this.overlayLayer.add(label);
    this.tweens.add({
      targets: label,
      y: y - 20,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => label.destroy()
    });
  }
}
