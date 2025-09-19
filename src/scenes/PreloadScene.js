export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.json('map', 'src/data/map.json');
  }

  create() {
    this.createTileTextures();
    this.createEnvironmentTextures();
    this.createCollisionTexture();
    this.createCharacterTextures();
    this.createEnemyTextures();
    this.createNpcTextures();
    this.createUiTextures();
    this.createFxTextures();
    this.createAnimations();

    this.scene.start('GameScene');
  }

  createEnvironmentTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const tile = 32;

    // Tree trunk
    g.clear();
    g.fillStyle(0x402f1e, 1);
    g.fillRoundedRect(tile / 2 - 6, 8, 12, 24, 4);
    g.fillStyle(0x2d2015, 1);
    g.fillRect(tile / 2 - 4, 12, 8, 16);
    g.generateTexture('tree-trunk', tile, tile);

    // Tree canopy
    g.clear();
    const canopyW = 48;
    const canopyH = 40;
    g.fillStyle(0x1f592c, 1);
    g.fillEllipse(canopyW / 2, canopyH / 2, canopyW, canopyH - 8);
    g.fillStyle(0x2f7c42, 0.9);
    g.fillEllipse(canopyW / 2 - 6, canopyH / 2 - 6, canopyW - 20, canopyH - 18);
    g.fillStyle(0x4fa35f, 0.6);
    g.fillEllipse(canopyW / 2 + 8, canopyH / 2, canopyW - 26, canopyH - 20);
    g.generateTexture('tree-canopy', canopyW, canopyH);

    // House roof
    g.clear();
    g.fillStyle(0x552f1d, 1);
    g.fillRect(0, 8, tile * 2, tile);
    g.fillStyle(0x753c24, 1);
    g.fillRect(0, 0, tile * 2, 12);
    g.lineStyle(2, 0x2d1409, 0.6);
    g.strokeRect(0, 0, tile * 2, tile + 8);
    g.generateTexture('house-roof', tile * 2, tile + 8);

    // Arch fragment
    g.clear();
    g.fillStyle(0x715fa8, 1);
    g.fillRoundedRect(0, 0, tile * 2, tile / 2, 12);
    g.lineStyle(3, 0xbab3ff, 0.6);
    g.strokeRoundedRect(1, 1, tile * 2 - 2, tile / 2 - 2, 12);
    g.generateTexture('stone-arch', tile * 2, tile / 2);

    // Lore stone
    g.clear();
    g.fillStyle(0x3a3f58, 1);
    g.fillRoundedRect(tile / 2 - 8, 4, 16, 24, 6);
    g.fillStyle(0x52618a, 1);
    g.fillRoundedRect(tile / 2 - 6, 6, 12, 20, 4);
    g.fillStyle(0xc7e0ff, 1);
    g.fillTriangle(tile / 2, 10, tile / 2 - 4, 20, tile / 2 + 4, 20);
    g.generateTexture('lore-stone', tile, tile);
  }

  createTileTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const tileSize = 32;

    const drawTile = (key, baseColor, accents = []) => {
      g.clear();
      g.fillStyle(baseColor, 1);
      g.fillRect(0, 0, tileSize, tileSize);
      accents.forEach((accent) => {
        g.fillStyle(accent.color, accent.alpha ?? 1);
        if (accent.type === 'rect') {
          g.fillRect(accent.x, accent.y, accent.w, accent.h);
        } else if (accent.type === 'triangle') {
          g.beginPath();
          g.moveTo(accent.points[0].x, accent.points[0].y);
          g.lineTo(accent.points[1].x, accent.points[1].y);
          g.lineTo(accent.points[2].x, accent.points[2].y);
          g.closePath();
          g.fillPath();
        } else if (accent.type === 'ellipse') {
          g.fillEllipse(accent.x, accent.y, accent.w, accent.h);
        }
      });
      g.generateTexture(key, tileSize, tileSize);
    };

    drawTile('tile-grass', 0x1f5130, [
      { type: 'rect', color: 0x26663d, x: 0, y: 0, w: 32, h: 16 },
      { type: 'rect', color: 0x2d7444, x: 4, y: 4, w: 4, h: 4 },
      { type: 'rect', color: 0x2b6d42, x: 20, y: 12, w: 5, h: 5 },
      { type: 'rect', color: 0x316f47, x: 12, y: 20, w: 3, h: 3 }
    ]);

    drawTile('tile-path', 0x806355, [
      { type: 'rect', color: 0x8f7261, x: 0, y: 0, w: 32, h: 12 },
      { type: 'rect', color: 0x735344, x: 8, y: 16, w: 16, h: 10 },
      { type: 'ellipse', color: 0x6b4b3e, x: 10, y: 20, w: 4, h: 2, alpha: 0.5 }
    ]);

    drawTile('tile-water', 0x235d91, [
      { type: 'rect', color: 0x2c6ea3, x: 0, y: 0, w: 32, h: 12 },
      { type: 'ellipse', color: 0x6bb6ff, x: 20, y: 10, w: 10, h: 6, alpha: 0.6 },
      { type: 'ellipse', color: 0x92d7ff, x: 10, y: 22, w: 8, h: 4, alpha: 0.4 }
    ]);

    drawTile('tile-stone', 0x4a4f55, [
      { type: 'rect', color: 0x5b6169, x: 0, y: 0, w: 32, h: 16 },
      { type: 'rect', color: 0x383d44, x: 4, y: 18, w: 8, h: 8 },
      { type: 'rect', color: 0x697078, x: 20, y: 4, w: 6, h: 6 }
    ]);

    drawTile('tile-wood', 0x9c5d3a, [
      { type: 'rect', color: 0xb06e49, x: 0, y: 0, w: 32, h: 8 },
      { type: 'rect', color: 0x854c2e, x: 4, y: 8, w: 24, h: 4 },
      { type: 'rect', color: 0xc07c52, x: 2, y: 16, w: 28, h: 4 }
    ]);

    drawTile('tile-moss', 0x27482c, [
      { type: 'rect', color: 0x345637, x: 0, y: 0, w: 32, h: 18 },
      { type: 'ellipse', color: 0x406945, x: 20, y: 10, w: 10, h: 4, alpha: 0.5 }
    ]);

    drawTile('tile-rune', 0x322b4b, [
      { type: 'rect', color: 0x463c6a, x: 0, y: 0, w: 32, h: 24 },
      {
        type: 'triangle',
        color: 0x8d7cf8,
        points: [
          { x: 16, y: 6 },
          { x: 10, y: 22 },
          { x: 22, y: 22 }
        ],
        alpha: 0.8
      },
      { type: 'ellipse', color: 0xe8d8ff, x: 16, y: 14, w: 6, h: 6, alpha: 0.9 }
    ]);

    drawTile('tile-farm', 0x523621, [
      { type: 'rect', color: 0x62402a, x: 0, y: 0, w: 32, h: 16 },
      { type: 'rect', color: 0x3a2414, x: 4, y: 6, w: 24, h: 6 },
      { type: 'rect', color: 0x7a4b2e, x: 6, y: 18, w: 20, h: 4 }
    ]);
  }

  createCollisionTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 0.001);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('collision-tile', 4, 4);
  }

  createCharacterTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const drawHero = (direction, frame) => {
      const w = 24;
      const h = 32;
      g.clear();
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(12, 27, 14, 6);

      const bodyColor = 0x4ad2ad;
      const trimColor = 0xfff7ae;
      const hairColor = 0x1c2533;
      const bootColor = 0x322b2b;

      // Cloak base
      g.fillStyle(bodyColor, 1);
      g.fillRoundedRect(6, 12, 12, 14, 6);
      g.fillStyle(trimColor, 1);
      g.fillRect(10, 12, 4, 12);

      // hood / hair
      g.fillStyle(hairColor, 1);
      if (direction === 'up') {
        g.fillEllipse(12, 12, 16, 12);
      } else if (direction === 'left') {
        g.fillEllipse(10, 11, 14, 12);
      } else if (direction === 'right') {
        g.fillEllipse(14, 11, 14, 12);
      } else {
        g.fillEllipse(12, 11, 16, 12);
      }

      // Arms
      g.fillStyle(bodyColor - 0x101010, 1);
      if (direction === 'left') {
        g.fillRect(4, 16, 6, 6);
        g.fillRect(14, 16, 4, 6);
      } else if (direction === 'right') {
        g.fillRect(14, 16, 6, 6);
        g.fillRect(6, 16, 4, 6);
      } else {
        g.fillRect(4, 16, 6, 6);
        g.fillRect(14, 16, 6, 6);
      }

      const footOffset = frame === 0 ? -1 : frame === 2 ? 1 : 0;
      const oppositeOffset = frame === 0 ? 1 : frame === 2 ? -1 : 0;
      g.fillStyle(bootColor, 1);
      if (direction === 'left') {
        g.fillRect(6, 24 + footOffset, 6, 6);
        g.fillRect(12, 24 + oppositeOffset, 6, 6);
      } else if (direction === 'right') {
        g.fillRect(6, 24 + oppositeOffset, 6, 6);
        g.fillRect(12, 24 + footOffset, 6, 6);
      } else {
        g.fillRect(6, 24 + footOffset, 5, 6);
        g.fillRect(13, 24 + oppositeOffset, 5, 6);
      }

      const key = `hero-${direction}-${frame}`;
      g.generateTexture(key, w, h);
    };

    ['down', 'left', 'right', 'up'].forEach((direction) => {
      for (let frame = 0; frame < 3; frame += 1) {
        drawHero(direction, frame);
      }
    });
  }

  createEnemyTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 32;
    const h = 36;
    for (let frame = 0; frame < 3; frame += 1) {
      g.clear();
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(w / 2, h - 4, 22, 8);

      g.fillStyle(0x3f6ca3, 1);
      g.fillRoundedRect(6, 8, 20, 20, 8);
      g.fillStyle(0x2c4f7d, 1);
      g.fillRect(10, 20, 12, 10);
      g.fillStyle(0x9ed3ff, 1);
      const eyeOffset = frame === 1 ? 0 : frame === 0 ? -1 : 1;
      g.fillCircle(12 + eyeOffset, 20, 3);
      g.fillCircle(20 + eyeOffset, 20, 3);
      g.fillStyle(0xe0f2ff, 1);
      g.fillRect(14, 24 + eyeOffset, 4, 4);
      g.generateTexture(`golem-${frame}`, w, h);
    }
  }

  createNpcTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Elder
    g.clear();
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(16, 30, 18, 8);
    g.fillStyle(0xc0a27f, 1);
    g.fillRoundedRect(8, 12, 16, 16, 6);
    g.fillStyle(0xe1dcd0, 1);
    g.fillRect(11, 8, 10, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRect(12, 10, 6, 8);
    g.generateTexture('elder', 32, 32);

    // Fairy sprite
    g.clear();
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(10, 18, 10, 4);
    g.fillStyle(0xffc6fa, 1);
    g.fillCircle(10, 10, 6);
    g.fillStyle(0xf0a5ff, 0.7);
    g.fillEllipse(6, 12, 10, 4);
    g.fillEllipse(14, 12, 10, 4);
    g.generateTexture('fairy', 20, 20);

    // Seed item
    g.clear();
    g.fillStyle(0x9fffe0, 1);
    g.fillEllipse(10, 14, 8, 12);
    g.fillStyle(0x69d8b6, 1);
    g.fillEllipse(8, 12, 4, 6);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(12, 10, 3);
    g.generateTexture('lumin-seed', 20, 24);
  }

  createUiTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // UI Panel
    g.clear();
    g.fillStyle(0x0f1724, 0.85);
    g.fillRoundedRect(0, 0, 360, 96, 12);
    g.lineStyle(2, 0x9de1ff, 0.6);
    g.strokeRoundedRect(1, 1, 358, 94, 12);
    g.generateTexture('ui-panel', 360, 96);

    // Heart textures
    g.clear();
    g.fillStyle(0xe53e3e, 1);
    g.fillCircle(8, 6, 6);
    g.fillCircle(16, 6, 6);
    g.fillTriangle(4, 10, 20, 10, 12, 22);
    g.generateTexture('heart-full', 24, 24);

    g.clear();
    g.lineStyle(2, 0xe53e3e, 0.8);
    g.strokeCircle(8, 6, 6);
    g.strokeCircle(16, 6, 6);
    g.strokeTriangle(4, 10, 20, 10, 12, 22);
    g.generateTexture('heart-empty', 24, 24);

    // Quest icon
    g.clear();
    g.fillStyle(0xfacc15, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xa16207, 1);
    g.fillRect(8, 4, 16, 24);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 6, 12, 16);
    g.generateTexture('icon-quest', 32, 32);
  }

  createFxTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(0, 8, 32, 0, 32, 16);
    g.generateTexture('slash', 32, 16);

    g.clear();
    g.fillStyle(0x9de1ff, 0.6);
    g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
  }

  createAnimations() {
    const addAnim = (config) => {
      if (this.anims.get(config.key)) return;
      this.anims.create(config);
    };

    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((direction) => {
      addAnim({
        key: `hero-walk-${direction}`,
        frames: [
          { key: `hero-${direction}-0` },
          { key: `hero-${direction}-1` },
          { key: `hero-${direction}-2` },
          { key: `hero-${direction}-1` }
        ],
        frameRate: 6,
        repeat: -1
      });
      addAnim({
        key: `hero-idle-${direction}`,
        frames: [{ key: `hero-${direction}-1` }],
        frameRate: 1,
        repeat: -1
      });
    });

    addAnim({
      key: 'golem-walk',
      frames: [
        { key: 'golem-0' },
        { key: 'golem-1' },
        { key: 'golem-2' },
        { key: 'golem-1' }
      ],
      frameRate: 4,
      repeat: -1
    });
  }
}
