각하,
요청하신 “Vercel 무료 요금제에서 1인용 2.5D RPG” 제작 **풀 가이드라인**을 아래에 Markdown 형식으로 정리했습니다. 질문 없이 바로 만들 수 있도록 **의사결정 기본값**까지 포함했습니다. (추가 선호가 있으시면 이후에 세부 튜닝해 드리겠습니다.)

---

# 2.5D 싱글플레이어 RPG (Vercel Free) — 풀 가이드라인

## 0) 결론 먼저 (의사결정 기본값)

* **런타임/엔진:** `Phaser 3` (CDN 로드, 번들러 없이 시작)
* **투영(2.5D 방식):** 정사각(톱다운) + **Y-기반 depth-sorting**로 “2.5D 느낌” 구현 (등뒤 가림/그림자/높이 오프셋)
* **맵 에디터:** `Tiled` (추후), MVP는 하드코딩 맵 또는 간단한 JSON
* **저장:** `localStorage` (MVP), 필요 시 `IndexedDB`로 확장
* **배포:** **정적 사이트**로 Vercel 업로드 (빌드 단계 없음)
* **PWA:** 간단 매니페스트 + SW로 오프라인 플레이 지원(선택)

> Devil’s advocate: “진짜 등각(isometric)?” — 가능하나, 진입장벽↑·컨텐츠 제작비↑. 각하는 1인 개발이므로 **톱다운+z정렬**이 **가성비 최상**입니다.

---

## 1) 범위·목표·제약

* **목표:** 모바일/태블릿/PC 브라우저에서 즉시 플레이 가능한 **가벼운 2.5D RPG**
* **싱글플레이, 서버 없음**(치트 방지 불요, 비용 0원 유지)
* **Vercel Free 제약 대응:** 서버리스 호출 불필요, 정적 자산만 사용
* **성공 기준:**

  1. 이동/충돌/상호작용/대화/퀘스트 1개/저장·로드
  2. 건물 뒤로 들어가면 캐릭터 반투명 가림/깊이 자연스러움
  3. iOS 사파리 **핀치줌 차단**(이전 불편 사항 예방)

---

## 2) 프로젝트 구조

```
rpg-25d/
├─ index.html
├─ vercel.json                # (선택) 정적 캐시/클린URL
├─ public/
│  ├─ tiles/                  # 타일/오브젝트 이미지
│  ├─ sprites/
│  ├─ ui/
│  ├─ manifest.webmanifest    # (선택) PWA
│  └─ sw.js                   # (선택) Service Worker
└─ src/
   ├─ main.js                 # Phaser 초기화
   ├─ scenes/
   │  ├─ BootScene.js
   │  ├─ PreloadScene.js
   │  ├─ GameScene.js
   │  └─ UIScene.js
   ├─ systems/
   │  ├─ input.js
   │  ├─ save.js
   │  └─ depth.js
   └─ data/
      └─ map.json             # (MVP 단순 맵 데이터)
```

---

## 3) 빠른 시작 (로컬 & 배포)

### 3.1 로컬 실행

* 번들러 없이 브라우저 모듈 사용. VSCode의 “Live Server” 확장 또는 임시 파이썬 서버:

```bash
# Python 3
python -m http.server 5500
# http://localhost:5500 접속
```

### 3.2 Vercel 배포

1. GitHub 레포 생성 → 위 구조 업로드
2. Vercel 대시보드 → **New Project** → 레포 선택 → Framework: **Other** (Static)
3. Build Command: **(비움)**, Output Dir: **/**
4. (선택) `vercel.json`:

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)\\.(png|jpg|jpeg|webp|gif|mp3)",
      "headers": [{ "key": "Cache-Control", "value": "public,max-age=31536000,immutable" }]
    }
  ]
}
```

---

## 4) 2.5D 구현 전략 (현실적 선택지 비교)

* **A. 톱다운 + Y-정렬(기본값)**

  * 스프라이트의 `depth = sprite.y`로 자연스러운 **앞뒤 겹침**.
  * 건물 상단/지붕 레이어는 플레이어보다 depth가 높아 가림. 충돌은 바닥 레이어.
  * **장점:** 구현 단순/에셋 제작 쉬움/퍼포먼스 우수.
  * **단점:** “완전 등각” 시각은 아님(그러나 대부분의 인디 2.5D에 충분).

* **B. 진성 등각(isometric) 타일맵**

  * 제작 난이도↑. 타일/오브젝트의 앵커·충돌 박스·경사 처리 복잡.
  * 1인 개발 MVP엔 비추.

> 각하께 최적: **A안**. 개발/컨텐츠 비용 대비 시각효과가 가장 낫습니다.

---

## 5) 핵심 시스템 설계

### 5.1 Phaser 초기화 (CDN)

**`index.html`**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>25D RPG</title>
  <style>
    html,body{margin:0;height:100%;background:#0b0f14;}
    #game-root{width:100vw;height:100vh;touch-action:none;} /* iOS 제스처 억제 */
    canvas{image-rendering: pixelated;}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
</head>
<body>
  <div id="game-root"></div>
  <script type="module" src="./src/main.js"></script>
  <script>
    // iOS Safari 핀치줌/더블탭 줌 억제
    document.addEventListener('gesturestart', e => e.preventDefault(), {passive:false});
    let lastTouchEnd = 0;
    document.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, {passive:false});
  </script>
</body>
</html>
```

**`src/main.js`**

```js
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 960, height: 540, // 16:9
  backgroundColor: '#101418',
  pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [BootScene, PreloadScene, GameScene, UIScene],
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH }
};

new Phaser.Game(config);
```

### 5.2 씬 구성 개요

* **BootScene:** 기기/플랫폼 설정(해상도, 입력)
* **PreloadScene:** 에셋 로딩(스프라이트시트, 타일, 폰트, 사운드)
* **GameScene:** 맵·플레이어·NPC·충돌·카메라·깊이
* **UIScene:** HP/MP, 미니맵, 대화창, 인벤토리

### 5.3 Y-기반 깊이 정렬 & 가림

**아이디어:** 매 프레임, 표시 객체의 `depth = y`(또는 `y + heightBias`)로 설정.

```js
// src/systems/depth.js
export function applyYDepthSort(container) {
  container.list.forEach(obj => { if (obj.y !== undefined) obj.depth = obj.y; });
}
```

**건물 가림(반투명 처리):** 플레이어가 건물 지붕 경계 박스와 overlap 시 지붕 alpha ↓

```js
// GameScene.js (발췌)
this.physics.add.overlap(player, roofTrigger, () => { roof.setAlpha(0.35); });
this.physics.add.overlapExit?.(player, roofTrigger, () => { roof.setAlpha(1); }); // 폴리필 필요 시 커스텀
```

> Note: `overlapExit`는 직접 상태 플래그로 구현하세요(enter/leave 체크).

### 5.4 이동·충돌·카메라

* 이동: WASD/방향키 + 가상패드(모바일)
* 충돌: 바닥 충돌 레이어(충돌 타일에 `collides: true` 속성)
* 카메라: 플레이어 추적 + **deadzone**(UI 흔들림 최소화)

### 5.5 상호작용 & 대화

* 인터랙트 키(E/스페이스) 근접 시 활성
* 대화 스크립트는 간단한 JSON:

```json
[
  {"id":"intro_1","speaker":"NPC","text":"어서 와."},
  {"id":"intro_2","speaker":"YOU","text":"도움이 필요합니다."}
]
```

### 5.6 인벤토리 & 저장

* **MVP:** `localStorage` 직렬화

```js
// src/systems/save.js
const KEY = 'rpg25d_save_v1';
export const saveGame = (state) => localStorage.setItem(KEY, JSON.stringify(state));
export const loadGame = () => JSON.parse(localStorage.getItem(KEY) || '{}');
```

---

## 6) 맵 파이프라인(MVP→확장)

### 6.1 MVP (코드/간이 JSON)

* 타일 1\~2종, 장애물/통행 가능 구역만으로 플레이 가능
* 오브젝트(문, 상자, NPC)는 좌표 배열로 배치

### 6.2 Tiled로 확장

* 레이어: `Ground`(충돌속성 없음), `Collision`(`collides:true`), `Roof`(가림), `Decor`(깊이만 영향)
* 오브젝트 레이어: `NPCs`, `Triggers`(대화/전투/맵 전환)
* Tiled 내 타일 속성:

  * `collides: true` → Arcade Physics setCollisionByProperty
  * `roof: true` → 오버랩 시 alpha 제어

---

## 7) 최소 코드 스켈레톤 (발췌)

**`src/scenes/BootScene.js`**

```js
export default class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  create(){ this.scene.start('Preload'); }
}
```

**`src/scenes/PreloadScene.js`**

```js
export default class PreloadScene extends Phaser.Scene {
  constructor(){ super('Preload'); }
  preload(){
    this.load.image('player', 'public/sprites/player.png');
    this.load.image('tile', 'public/tiles/ground.png');
    this.load.image('rock', 'public/tiles/rock.png');
    this.load.image('roof', 'public/tiles/roof.png');
  }
  create(){ this.scene.start('Game'); }
}
```

**`src/scenes/GameScene.js` (핵심 부분)**

```js
import { applyYDepthSort } from '../systems/depth.js';

export default class GameScene extends Phaser.Scene {
  constructor(){ super('Game'); }
  create(){
    const W = 2000, H = 2000;
    this.cameras.main.setBounds(0,0,W,H);

    // 바닥 타일 그리기(샘플)
    const ground = this.add.group();
    for(let x=0; x<W; x+=64){
      for(let y=0; y<H; y+=64){
        ground.add(this.add.image(x+32,y+32,'tile'));
      }
    }

    // 장애물
    this.physics.world.setBounds(0,0,W,H);
    this.obstacles = this.physics.add.staticGroup();
    const rock = this.obstacles.create(600, 600, 'rock');
    rock.setSize(56,56).setOffset(4,4);

    // 플레이어
    this.player = this.physics.add.image(400, 400, 'player').setDepth(400);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    // 지붕(가림)
    this.roof = this.add.image(600, 560, 'roof'); // 플레이어 뒤로 지나가면 가림
    this.physics.add.existing(this.roof, true);
    this.roof.body.setSize(128,96).setOffset(0,32); // 트리거 판정

    // 간이 overlap 상태 추적
    this.inRoof = false;
    this.physics.add.overlap(this.player, this.roof, () => {
      if(!this.inRoof){ this.inRoof = true; this.roof.setAlpha(0.35); }
    });

    // exit 판정(거리로)
    this.events.on('update', ()=>{
      const dx = this.player.x - this.roof.x;
      const dy = this.player.y - (this.roof.y+32);
      if(this.inRoof && Math.hypot(dx,dy) > 140){
        this.inRoof = false; this.roof.setAlpha(1);
      }
    });

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    // 카메라
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // 렌더 순서 컨테이너(깊이용)
    this.renderLayer = this.add.container(0,0, [this.player, this.roof]);
  }

  update(){
    const speed = 180;
    const p = this.player;
    let vx=0, vy=0;
    if(this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    else if(this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if(this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    else if(this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    p.setVelocity(vx, vy);

    // 2.5D 느낌: y-기반 깊이
    this.player.depth = this.player.y;
    this.roof.depth = this.roof.y + 100; // 지붕이 항상 위

    // 필요 시 컨테이너 전체 y-sort
    // applyYDepthSort(this.renderLayer);
  }
}
```

---

## 8) UI/UX 필수 체크리스트

* **모바일 제스처 차단:** (위 코드 포함) 핀치/더블탭 줌 억제
* **가상패드(선택):** 모바일에서 터치 조이스틱 추가
* **폰트/가독성:** 14–16px 이상, 대비 충분
* **프레임 타깃:** 60fps (iPad·모바일 기준 스프라이트 수 억제)

---

## 9) PWA(선택이지만 추천)

**`public/manifest.webmanifest`**

```json
{
  "name": "25D RPG",
  "short_name": "RPG",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#101418",
  "theme_color": "#101418",
  "icons": []
}
```

**`sw.js`**: 기본 캐시 전략(초간단)

```js
self.addEventListener('install', e => {
  e.waitUntil(caches.open('rpg-v1').then(c => c.addAll(['/', '/index.html'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

`index.html`에서 등록:

```html
<script>
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
}
</script>
```

---

## 10) 아트/사운드 에셋 (실무 팁)

* **픽셀아트**(권장): 용량↓, 깊이정렬 노이즈↓, 제작 용이
* 무료 에셋 소스(예: Kenney, 0x72 등) → 라이선스 확인 후 `public/`에 배치
* **아틀라스**(후속): 텍스처 바인딩 감소로 성능↑

---

## 11) 테스트 & 품질

* **해상도 매트릭스:** 16:9(960×540) 기준 스케일링, iPhone·iPad·FHD·4K 체크
* **입력:** 키보드, 터치(탭·드래그), 게임패드(선택)
* **세이브 호환성:** `localStorage` 키 버전 관리(`_v1` → `_v2` 마이그레이션 루틴)

---

## 12) 성능·안정성·함정 (Devil’s advocate)

* **과도한 타일/스프라이트 수** → 모바일 프레임 급락. 타일은 **청크 로딩** 고려.
* **실제 등각** 시 경사·충돌·Z정렬 **복잡도 급상승**. 1인개발은 톱다운이 합리적.
* **iOS 정책 변화**로 제스처 차단이 100% 보장되지 않을 수 있음 → vJoystick 채택 고려.
* **서버가 필요해지면?** Vercel Free의 서버리스 한도/콜드스타트 고려. 가급적 **오프라인 우선**.

---

## 13) 로드맵 (선택 확장)

1. **타일맵 전환(Tiled)** → 맵 제작 효율↑
2. **퀘스트 시스템**(상태머신/플래그)
3. **전투/피해 판정**(원형 콜라이더 + i프레임)
4. **인벤토리/장비/스탯**
5. **PWA 오프라인 완성** + 스플래시/아이콘
6. **세이브 슬롯/클라우드 동기화**(필요시 서버리스)

---

## 14) 체크리스트 (한눈에)

* [ ] Phaser 3 CDN, 정적 사이트로 시작
* [ ] 톱다운 + Y-정렬로 2.5D 연출
* [ ] 충돌/가림/카메라/대화/저장 MVP 완성
* [ ] iOS 핀치/더블탭 줌 억제
* [ ] Vercel에 정적 배포(빌드 없음)
* [ ] (선택) PWA 등록

---

## 15) 다음 조정 포인트(각하께 여쭙습니다)

* 캐릭터/타일 **아트 스타일** 선호(픽셀/하이레졸루션) : 픽셀 선호. 픽셀 스타일로 개발
* 입력 방식(가상패드 포함 여부) : 키보드 기반
* **전투 유무**(MVP부터?) : 간단한 전투 반드시 포함. 
* 스토리 톤/대사 길이(짧고 반복 가능한 구조 vs 서사형) : 서사 구축. 개발과정에서의 서사 일관성을 위해, 개발과정에서 개발 할때마다 중심 서사를 따로 마크다운으로 저장.
