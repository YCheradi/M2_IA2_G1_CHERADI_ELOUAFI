// --- Game state & main collections (p5.js loop) ---
// Le jeu alterne entre plusieurs états UI (menu / playing / levelup / aidchoice / shop / gameover).
let state = 'menu';

// Entités principales
let player;
let enemies = [];
let projectiles = [];
let enemyProjectiles = [];
let gems = [];
let orbitals = [];
let whipStrikes = [];
let boomerangs = [];
let pickups = [];
let beams = [];
let aids = [];
let snakes = [];

// Monde (chunks, obstacles/planètes, caméra)
let obstacles = [];
let path;

let chunkSize = 900;
let planetChunks = new Map();
let starChunks = new Map();
let visibleObstacles = [];

// Particules (thrusters, impacts, etc.)
let particles = [];

let cameraPos;

let shakePower = 0;
let shakeUntilMs = 0;

// Options runtime (peuvent être togglées au clavier)
let settings = {
  sfx: true,
  particles: true,
  hyperspace: true,
  postFx: true,
  heatShimmer: true,
  casual: true,
};
let voidBeamSettings = {
  length: 520,
  thickness: 10,
  damageMul: 1.0,
  durationMs: null,
};

// --- Assets sprites (chargés dans preload/setup) ---
let playerSprite;
let playerVehicleSprites = [];
let selectedPlayerVehicleIdx = 0;

let menaceSprites = [];
let minibossSprites = [];
let bossSprites = [];
let snakeSprite;

// Sprite de bouclier généré dynamiquement (createGraphics) pour éviter une dépendance à un fichier externe.
let shieldSprite;

// Sprite du laser (utilisé pour les beams laser et les projectiles laser en fallback)
let laserSprite;

// --- Explosions animées (GIFs) ---
let explosionImgs = [];
let explosions = [];

// --- Effets plein écran (freeze, nuke, etc.) ---
let screenEffects = [];

// Effet plein écran temporaire (dessiné en screen-space, après le monde)
class ScreenEffect {
  constructor(kind, durationMs) {
    this.kind = kind;
    this.startMs = millis();
    this.durationMs = durationMs || 900;
    this.dead = false;
  }
  update() {
    if (millis() - this.startMs >= this.durationMs) this.dead = true;
  }
  draw() {
    let t = max(0, min(1, (millis() - this.startMs) / max(1, this.durationMs)));
    let cx = width * 0.5;
    let cy = height * 0.5;
    let maxR = max(width, height) * 0.95;

    if (this.kind === 'freeze') {
      let ease = 1 - pow(1 - t, 2.2);
      let a = 220 * (1 - t);

      push();
      blendMode(ADD);
      noStroke();

      fill(140, 210, 255, a * 0.10);
      rect(0, 0, width, height);

      for (let i = 0; i < 7; i++) {
        let u = i / 6;
        let rr = maxR * (0.18 + ease * (0.92 + 0.22 * u));
        let aa = a * (0.25 * (1 - u)) * (1 - 0.35 * ease);
        fill(160, 220, 255, aa * 0.22);
        circle(cx, cy, rr * 2);
      }

      noFill();
      stroke(210, 250, 255, a * 0.95);
      strokeWeight(6);
      circle(cx, cy, maxR * (0.22 + ease * 1.15) * 2);
      stroke(255, 255, 255, a * 0.55);
      strokeWeight(2);
      circle(cx, cy, maxR * (0.18 + ease * 1.06) * 2);

      let rays = 46;
      stroke(170, 230, 255, a * 0.35);
      strokeWeight(2);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * TWO_PI;
        let wob = 0.35 * sin((this.startMs * 0.001) + i);
        let r0 = maxR * (0.08 + ease * 0.15);
        let r1 = maxR * (0.22 + ease * 1.08) * (0.75 + 0.25 * sin(i * 2.1 + this.startMs * 0.002));
        let x0 = cx + cos(ang + wob) * r0;
        let y0 = cy + sin(ang + wob) * r0;
        let x1 = cx + cos(ang + wob) * r1;
        let y1 = cy + sin(ang + wob) * r1;
        line(x0, y0, x1, y1);
      }

      blendMode(BLEND);
      pop();
      return;
    }

    if (this.kind === 'nuke' || this.kind === 'mega_nuke') {
      let mega = this.kind === 'mega_nuke';
      let ease = 1 - pow(1 - t, mega ? 2.8 : 2.4);
      let a = (mega ? 255 : 235) * (1 - t);
      let col0 = mega ? [255, 120, 80] : [255, 160, 90];
      let col1 = mega ? [255, 240, 200] : [255, 230, 170];

      push();
      blendMode(ADD);
      noStroke();

      fill(col0[0], col0[1], col0[2], a * (mega ? 0.16 : 0.12));
      rect(0, 0, width, height);

      for (let i = 0; i < (mega ? 10 : 7); i++) {
        let u = i / (mega ? 9 : 6);
        let rr = maxR * (0.10 + ease * (0.95 + 0.35 * u));
        let aa = a * (0.30 * (1 - u)) * (1 - 0.25 * ease);
        fill(col0[0], col0[1], col0[2], aa * 0.14);
        circle(cx, cy, rr * 2);
      }

      noFill();
      stroke(col1[0], col1[1], col1[2], a * 0.95);
      strokeWeight(mega ? 10 : 7);
      circle(cx, cy, maxR * (0.16 + ease * 1.25) * 2);
      stroke(255, 255, 255, a * 0.45);
      strokeWeight(mega ? 4 : 3);
      circle(cx, cy, maxR * (0.12 + ease * 1.17) * 2);

      let rays = mega ? 74 : 56;
      stroke(col1[0], col1[1], col1[2], a * 0.32);
      strokeWeight(mega ? 3 : 2);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * TWO_PI;
        let wob = (mega ? 0.55 : 0.35) * sin((this.startMs * 0.001) + i);
        let r0 = maxR * (0.06 + ease * 0.20);
        let r1 = maxR * (0.18 + ease * 1.12) * (0.72 + 0.28 * sin(i * 1.7 + this.startMs * 0.002));
        let x0 = cx + cos(ang + wob) * r0;
        let y0 = cy + sin(ang + wob) * r0;
        let x1 = cx + cos(ang + wob) * r1;
        let y1 = cy + sin(ang + wob) * r1;
        line(x0, y0, x1, y1);
      }

      blendMode(BLEND);
      pop();
    }

    if (this.kind === 'spell_shield') {
      let ease = 1 - pow(1 - t, 2.4);
      let a = 240 * (1 - t);
      push();
      blendMode(ADD);
      noStroke();
      fill(120, 220, 255, a * 0.12);
      rect(0, 0, width, height);

      for (let i = 0; i < 8; i++) {
        let u = i / 7;
        let rr = maxR * (0.10 + ease * (0.45 + 0.55 * u));
        let aa = a * (0.22 * (1 - u));
        fill(140, 235, 255, aa * 0.18);
        circle(cx, cy, rr * 2);
      }

      noFill();
      stroke(200, 250, 255, a * 0.95);
      strokeWeight(7);
      circle(cx, cy, maxR * (0.12 + ease * 0.62) * 2);
      stroke(255, 255, 255, a * 0.55);
      strokeWeight(2);
      circle(cx, cy, maxR * (0.10 + ease * 0.58) * 2);

      blendMode(BLEND);
      pop();
      return;
    }

    if (this.kind === 'chain_lightning') {
      let ease = 1 - pow(1 - t, 2.0);
      let a = 255 * (1 - t);
      push();
      blendMode(ADD);
      noFill();
      stroke(160, 220, 255, a * 0.28);
      strokeWeight(3);
      for (let i = 0; i < 12; i++) {
        let u = i / 11;
        let rr = maxR * (0.10 + ease * (0.38 + 0.40 * u));
        circle(cx, cy, rr * 2);
      }

      let rays = 48;
      stroke(210, 245, 255, a * 0.75);
      strokeWeight(2);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * TWO_PI;
        let r0 = maxR * (0.10 + ease * 0.10);
        let r1 = maxR * (0.22 + ease * 0.78) * (0.78 + 0.22 * sin(i * 2.3 + this.startMs * 0.004));
        let zig = 0.10 * sin(i * 1.7 + this.startMs * 0.006);
        let x0 = cx + cos(ang) * r0;
        let y0 = cy + sin(ang) * r0;
        let xm = cx + cos(ang + zig) * ((r0 + r1) * 0.5);
        let ym = cy + sin(ang + zig) * ((r0 + r1) * 0.5);
        let x1 = cx + cos(ang) * r1;
        let y1 = cy + sin(ang) * r1;
        line(x0, y0, xm, ym);
        line(xm, ym, x1, y1);
      }

      blendMode(BLEND);
      pop();
      return;
    }

    if (this.kind === 'ship_interceptor' || this.kind === 'ship_bomber') {
      let bomber = this.kind === 'ship_bomber';
      let ease = 1 - pow(1 - t, bomber ? 2.2 : 2.6);
      let a = 245 * (1 - t);
      let col0 = bomber ? [255, 170, 90] : [120, 255, 180];
      let col1 = bomber ? [255, 240, 190] : [200, 255, 230];
      push();
      blendMode(ADD);
      noStroke();
      fill(col0[0], col0[1], col0[2], a * 0.10);
      rect(0, 0, width, height);

      for (let i = 0; i < (bomber ? 7 : 9); i++) {
        let u = i / ((bomber ? 6 : 8));
        let rr = maxR * (0.08 + ease * (0.36 + 0.18 * u));
        let aa = a * (0.22 * (1 - u));
        fill(col0[0], col0[1], col0[2], aa * 0.16);
        circle(cx, cy, rr * 2);
      }

      noFill();
      stroke(col1[0], col1[1], col1[2], a * 0.95);
      strokeWeight(bomber ? 8 : 6);
      circle(cx, cy, maxR * (0.11 + ease * 0.52) * 2);
      stroke(255, 255, 255, a * 0.45);
      strokeWeight(2);
      circle(cx, cy, maxR * (0.10 + ease * 0.48) * 2);

      let rays = bomber ? 38 : 52;
      stroke(col1[0], col1[1], col1[2], a * 0.30);
      strokeWeight(2);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * TWO_PI;
        let r0 = maxR * (0.06 + ease * 0.10);
        let r1 = maxR * (0.12 + ease * 0.78) * (0.78 + 0.22 * sin(i * 2.0 + this.startMs * 0.003));
        let x0 = cx + cos(ang) * r0;
        let y0 = cy + sin(ang) * r0;
        let x1 = cx + cos(ang) * r1;
        let y1 = cy + sin(ang) * r1;
        line(x0, y0, x1, y1);
      }

      blendMode(BLEND);
      pop();
    }

    if (this.kind === 'weapon_laser' || this.kind === 'weapon_ion') {
      let laser = this.kind === 'weapon_laser';
      let ease = 1 - pow(1 - t, laser ? 2.4 : 2.1);
      let a = 250 * (1 - t);
      let col0 = laser ? [140, 210, 255] : [180, 235, 255];
      let col1 = laser ? [255, 255, 255] : [220, 250, 255];

      push();
      blendMode(ADD);
      noStroke();
      fill(col0[0], col0[1], col0[2], a * (laser ? 0.10 : 0.08));
      rect(0, 0, width, height);

      noFill();
      stroke(col0[0], col0[1], col0[2], a * 0.75);
      strokeWeight(laser ? 7 : 6);
      circle(cx, cy, maxR * (0.14 + ease * 0.70) * 2);
      stroke(col1[0], col1[1], col1[2], a * 0.55);
      strokeWeight(2);
      circle(cx, cy, maxR * (0.12 + ease * 0.64) * 2);

      let rays = laser ? 62 : 42;
      stroke(col1[0], col1[1], col1[2], a * (laser ? 0.32 : 0.22));
      strokeWeight(2);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * TWO_PI;
        let wob = (laser ? 0.25 : 0.15) * sin((this.startMs * 0.001) + i);
        let r0 = maxR * (0.06 + ease * 0.14);
        let r1 = maxR * (0.16 + ease * 0.92) * (0.78 + 0.22 * sin(i * 2.0 + this.startMs * 0.003));
        let x0 = cx + cos(ang + wob) * r0;
        let y0 = cy + sin(ang + wob) * r0;
        let x1 = cx + cos(ang + wob) * r1;
        let y1 = cy + sin(ang + wob) * r1;
        line(x0, y0, x1, y1);
      }

      blendMode(BLEND);
      pop();
      return;
    }
  }
}

// Déclenche l'effet plein écran de freeze (feedback visuel quand la compétence est choisie)
function spawnFreezeScreenExplosion() {
  screenEffects.push(new ScreenEffect('freeze', 900));
}

// Déclenche l'effet plein écran pour Nuke / Mega Nuke
function spawnNukeScreenExplosion(type) {
  if (type === 'mega_nuke') screenEffects.push(new ScreenEffect('mega_nuke', 760));
  else screenEffects.push(new ScreenEffect('nuke', 620));
}

// Petit helper: effets UI plein écran lors du choix d'une carte (Weapons/Spells/Ship)
function spawnAidScreenEffect(kind) {
  if (kind === 'spell_shield') screenEffects.push(new ScreenEffect('spell_shield', 540));
  else if (kind === 'chain_lightning') screenEffects.push(new ScreenEffect('chain_lightning', 520));
  else if (kind === 'ship_interceptor') screenEffects.push(new ScreenEffect('ship_interceptor', 620));
  else if (kind === 'ship_bomber') screenEffects.push(new ScreenEffect('ship_bomber', 680));
  else if (kind === 'weapon_laser') screenEffects.push(new ScreenEffect('weapon_laser', 520));
  else if (kind === 'weapon_ion') screenEffects.push(new ScreenEffect('weapon_ion', 520));
}

class Explosion {
  constructor(x, y, img, size, durationMs) {
    this.pos = createVector(x, y);
    this.img = img || null;
    this.size = size || 80;
    this.startMs = millis();
    this.durationMs = durationMs || 520;
    this.dead = false;
  }
  update() {
    if (millis() - this.startMs >= this.durationMs) this.dead = true;
  }
  draw(alpha = 255) {
    if (!this.img) return;
    let t = max(0, min(1, (millis() - this.startMs) / max(1, this.durationMs)));
    push();
    imageMode(CENTER);
    tint(255, alpha * (1 - 0.35 * t));
    image(this.img, this.pos.x, this.pos.y, this.size, this.size);
    pop();
  }
}

function buildShieldSprite(size) {
  let sz = max(64, size | 0);
  let g = createGraphics(sz, sz);
  g.pixelDensity(1);
  g.clear();

  let cx = sz * 0.5;
  let cy = sz * 0.5;
  let r = sz * 0.36;

  g.noStroke();
  for (let i = 0; i < 120; i++) {
    let t = i / 119;
    let rr = lerp(18, 3, t);
    let aa = lerp(75, 0, t);
    g.fill(10, 40, 80, aa);
    g.circle(cx, cy, (r * 2.05) - rr);
  }

  g.blendMode(ADD);
  for (let i = 0; i < 110; i++) {
    let t = i / 109;
    let rad = r * (1.05 + t * 0.55);
    let a = 28 * (1 - t) * (1 - t);
    g.noFill();
    g.stroke(120, 220, 255, a);
    g.strokeWeight(3.0 + 6.0 * (1 - t));
    g.circle(cx, cy, rad * 2);
  }

  g.noFill();
  g.stroke(210, 250, 255, 190);
  g.strokeWeight(sz * 0.014);
  g.circle(cx, cy, r * 2.18);
  g.stroke(255, 255, 255, 120);
  g.strokeWeight(sz * 0.006);
  g.circle(cx, cy, r * 2.20);

  g.noStroke();
  for (let i = 0; i < 600; i++) {
    let ang = random(TWO_PI);
    let rr = r * random(0.9, 1.45);
    let x = cx + cos(ang) * rr + randomGaussian() * 1.8;
    let y = cy + sin(ang) * rr + randomGaussian() * 1.8;
    let a = random(12, 75);
    let s = random(1.0, 3.2);
    g.fill(170, 240, 255, a);
    g.circle(x, y, s);
  }

  g.blendMode(BLEND);
  return g;
}

function spawnExplosion(x, y, sizeMul = 1, durationMs = 520) {
  if (!explosionImgs || explosionImgs.length === 0) return;
  let img = random(explosionImgs);
  if (!img) return;
  let baseSize = 90;
  explosions.push(new Explosion(x, y, img, baseSize * sizeMul, durationMs));
}

function killEnemy(e) {
  if (!e || e.dead) return;
  e.dead = true;
  playSfx('kill');
  let mul = e.isBoss ? 2.2 : (e.isElite ? 1.55 : 1.0);
  spawnExplosion(e.pos.x, e.pos.y, mul, e.isBoss ? 900 : (e.isElite ? 700 : 520));
  dropGemsForEnemy(e);
}

function setPlayerVehicle(idx) {
  let i = max(0, min(3, idx | 0));
  selectedPlayerVehicleIdx = i;
  if (playerVehicleSprites && playerVehicleSprites[i]) {
    playerSprite = playerVehicleSprites[i];
  }
}

let audioCtx = null;
let masterGain = null;

let sfxBuffers = {};
let sfxLoadingStarted = false;

// --- Audio ---
// SFX: chargés en AudioBuffer (mp3) via WebAudio.
// Fallback: si le buffer n'est pas prêt, playSfx() joue un petit "bip" (oscillator).

let hudDiv;
let overlayDiv;
let panelDiv;
let choicesDiv;

let keys = { w: false, a: false, s: false, d: false };

let startMs = 0;
let lastSpawnMs = 0;
let lastShotMs = 0;
let nextBossAtMs = 0;
let lastWhipMs = 0;
let lastBoomerangMs = 0;
let lastAuraTickMs = 0;

let nextSnakeAtMs = 0;

let lastAidSpawnMs = 0;
let nextAidInMs = 0;

let nextShopAtMs = 0;
let shopSpent = 0;
let currentShopChoices = [];

let freezeUntilMs = 0;

let drones = [];

let loadingBuilt = false;
let loadingDoneAtMs = 0;
let loadingStableFrames = 0;

let warmupUntilMs = 0;

let shimmerEnableAtMs = 0;

// Warmup: au tout début, on évite les passes lourdes (postFx/hyperspace/etc.) pour réduire les artefacts.

function inWarmup() {
  return millis() < warmupUntilMs;
}

let slowUntilMs = 0;

let invulnPowerUntilMs = 0;
let overdriveUntilMs = 0;

let objectiveRewarded = false;
let objectiveAtMs = 0;

let behaviorTuning = {
  enemySeek: 1.0,
  enemyAvoid: 1.8,
  enemyFollow: 0.0,
  enemyAvoidActive: true,
  enemyFollowActive: true,
};

let nebulaGfx;
let vignetteGfx;
let bloomGfx;

let planetImgs = [];
let planetsDecals = [];

let backgroundImgs = [];
let bgIndex = 0;
let bgNextIndex = 0;
let bgChangeEveryMs = 16000;
let bgFadeMs = 1400;
let bgLastChangeMs = 0;

let perfTuning = {
  bloomScale: 0.5,
  bloomBlurRadius: 1,
  bloomBlurEveryNFrames: 2,
  maxParticles: 900,
  shimmerMaxEnemies: 26,
  shimmerMaxDist: 700,
  shimmerEveryNFrames: 2,
  adaptiveQuality: true,
  adaptiveTargetFps: 57,
  adaptiveMinFps: 40,
  adaptiveMaxEnemiesLow: 140,
  adaptiveMaxEnemiesUltraLow: 95,
  bloomMaxParticlesInPass: 260,
  hudEveryNFrames: 5,
  minimapEveryNFrames: 10,
};

let perfState = {
  avgFps: 60,
  qualityLevel: 2, // 2=high, 1=low, 0=ultraLow
};

let lastHudFrame = -9999;

let currentAidChoices = [];

let spawnRate = 900;
let maxEnemies = 250;

let upgrades = {
  damage: 10,
  fireCooldownMs: 500,
  projectileSpeed: 11,
  projectilePierce: 1,
  moveSpeed: 5.2,
  pickupRadius: 60,
  maxHp: 100,
  regenPerSec: 0,
  orbitCount: 0,
  orbitRadius: 60,
  orbitSpeed: 0.025,
  orbitDamage: 8,
  dashCooldownMs: 2200,
  dashDurationMs: 160,
  dashSpeed: 15,

  whipUnlocked: false,
  whipCooldownMs: 1400,
  whipDamage: 18,
  whipRange: 140,
  whipWidth: 46,

  auraUnlocked: false,
  auraRadius: 90,
  auraDamage: 6,
  auraTickMs: 420,

  boomerangUnlocked: false,
  boomerangCooldownMs: 1800,
  boomerangDamage: 14,
  boomerangSpeed: 12,
  boomerangPierce: 2,

  magnetDurationMs: 7000,

  tripleShotUnlocked: false,
  ionBeamUnlocked: false,
  beamCooldownMs: 900,
  beamDurationMs: 240,
};

function setup() {
  createCanvas(windowWidth, windowHeight);

  shieldSprite = buildShieldSprite(512);

  hudDiv = createDiv('');
  hudDiv.id('hud');

  overlayDiv = createDiv('');
  overlayDiv.id('overlay');
  panelDiv = createDiv('');
  panelDiv.id('panel');
  overlayDiv.child(panelDiv);
  choicesDiv = createDiv('');
  choicesDiv.id('choices');
  panelDiv.child(choicesDiv);

  resetGame();
  showLoading();

  if (backgroundImgs && backgroundImgs.length) {
    bgIndex = floor(random(backgroundImgs.length));
    bgNextIndex = bgIndex;
    bgLastChangeMs = millis();
  }
}

function chooseNextBackground() {
  if (!backgroundImgs || backgroundImgs.length < 2) return;
  let next = bgIndex;
  let guard = 0;
  while (next === bgIndex && guard < 10) {
    next = floor(random(backgroundImgs.length));
    guard += 1;
  }
  bgNextIndex = next;
}

function drawBackgroundImage(img, a) {
  if (!img) return;
  let s = max(width / img.width, height / img.height);
  let w = img.width * s;
  let h = img.height * s;
  let x = (width - w) * 0.5;
  let y = (height - h) * 0.5;
  push();
  imageMode(CORNER);
  tint(255, a);
  image(img, x, y, w, h);
  pop();
}

function drawDynamicBackground() {
  if (!backgroundImgs || backgroundImgs.length === 0) return false;
  let now = millis();

  let warmup = inWarmup();

  if (now - bgLastChangeMs >= bgChangeEveryMs) {
    bgLastChangeMs = now;
    bgIndex = bgNextIndex;
    chooseNextBackground();
  }

  let t = (now - bgLastChangeMs) / max(1, bgFadeMs);
  t = max(0, min(1, t));

  let a0 = floor(255 * (1 - t));
  let a1 = floor(255 * t);
  drawBackgroundImage(backgroundImgs[bgIndex], a0);
  if (bgNextIndex !== bgIndex) {
    drawBackgroundImage(backgroundImgs[bgNextIndex], a1);
  }
  return true;
}

function playerShopBalance() {
  if (!player) return 0;
  return max(0, floor(player.totalXp) - shopSpent);
}

function buildShopChoices() {
  let pool = [
    { kind: 'aid', type: 'spell_shield', title: 'Shield (x3 hits)', desc: 'Bouclier renforcé.', baseCost: 30 },
    { kind: 'aid', type: 'repair', title: 'Repair', desc: 'Soigne + petit bouclier.', baseCost: 25 },
    { kind: 'aid', type: 'weapon_laser', title: 'Weapon: Laser', desc: 'Laser + triple temporaire.', baseCost: 45 },
    { kind: 'aid', type: 'weapon_ion', title: 'Weapon: Ion', desc: 'Tirs ion puissants.', baseCost: 45 },
    { kind: 'aid', type: 'ship_interceptor', title: 'Ship: Interceptor', desc: 'Cadence + vitesse (temp).', baseCost: 55 },
    { kind: 'aid', type: 'ship_bomber', title: 'Ship: Bomber', desc: 'Dégâts + pierce (temp).', baseCost: 55 },
    { kind: 'aid', type: 'freeze', title: 'Spell: Freeze', desc: 'Gèle les ennemis.', baseCost: 40 },
    { kind: 'aid', type: 'chain_lightning', title: 'Spell: Chain Lightning', desc: 'Éclair en chaîne.', baseCost: 40 },
    { kind: 'aid', type: 'drone', title: 'Ally: Drone', desc: 'Drone allié.', baseCost: 60 },
    { kind: 'aid', type: 'nuke', title: 'Explosive: Nuke', desc: 'Explosion massive.', baseCost: 80 },
    { kind: 'aid', type: 'mega_nuke', title: 'Explosive: Mega Nuke', desc: 'Explosion énorme.', baseCost: 120 },
  ];

  let minutes = max(0, (millis() - startMs) / 60000);
  let inflation = 1.0 + min(0.8, minutes * 0.08);

  let a = random(pool);
  pool = pool.filter(p => !(p.kind === a.kind && p.type === a.type));
  let b = random(pool);
  pool = pool.filter(p => !(p.kind === b.kind && p.type === b.type));
  let c = random(pool);

  let choices = [a, b, c].map(ch => {
    return {
      ...ch,
      cost: max(5, floor(ch.baseCost * inflation)),
    };
  });

  return choices;
}

function showShop(choices) {
  state = 'shop';
  overlayDiv.show();
  choicesDiv.show();
  panelDiv.html('');

  let bal = playerShopBalance();
  panelDiv.html(
    '<div class="ui-header">'
    + '<div>'
    + '<div class="ui-title">Star Wars: BattleSpace</div>'
    + '<div class="ui-subtitle">Marchand — choisis une amélioration</div>'
    + '</div>'
    + '<div class="ui-meta">Solde: <b>' + bal + '</b> XP</div>'
    + '</div>'
  );

  choicesDiv = createDiv('');
  choicesDiv.id('choices');
  panelDiv.child(choicesDiv);

  choices.forEach((c, idx) => {
    let affordable = bal >= c.cost;
    let card = createDiv('');
    let cat = 'upgrade';
    if (c && typeof c.type === 'string') {
      if (c.type.indexOf('weapon_') === 0) cat = 'weapon';
      else if (c.type.indexOf('spell_') === 0 || c.type === 'freeze' || c.type === 'chain_lightning') cat = 'spell';
      else if (c.type.indexOf('ship_') === 0) cat = 'ship';
      else if (c.type === 'nuke' || c.type === 'mega_nuke') cat = 'explosive';
      else if (c.type === 'drone') cat = 'ally';
    }
    card.class('choice choice--' + cat);
    let title = c.title + ' <span style="opacity:0.85">(' + c.cost + ')</span>';
    card.html(
      '<div class="choice-title">'
      + '<div><b>[' + (idx + 1) + ']</b> ' + title + '</div>'
      + '<span class="tag">' + cat + '</span>'
      + '</div>'
      + '<div style="opacity:0.9">' + c.desc + '</div>'
      + (affordable ? '' : '<div style="opacity:0.75;margin-top:8px">Pas assez de XP</div>')
    );
    if (affordable) {
      card.mousePressed(() => {
        buyShopChoice(c);
        overlayDiv.hide();
        state = 'playing';
      });
    }
    choicesDiv.child(card);
  });
}

function buyShopChoice(choice) {
  if (!choice) return;
  let bal = playerShopBalance();
  if (bal < choice.cost) return;
  shopSpent += choice.cost;
  if (choice.kind === 'aid') {
    applyAid(choice.type);
  }
}

function buildAidChoices() {
  let pool = [
    {
      type: 'weapon_laser',
      title: 'Weapon: Laser',
      desc: 'Tirs lasers rapides + triple shot temporaire.',
    },
    {
      type: 'weapon_ion',
      title: 'Weapon: Ion',
      desc: 'Tirs ion plus puissants pendant quelques secondes.',
    },
    {
      type: 'spell_shield',
      title: 'Spell: Shield',
      desc: 'Gagne plusieurs hits de bouclier.',
    },
    {
      type: 'freeze',
      title: 'Spell: Freeze',
      desc: 'Gèle les ennemis pendant quelques secondes.',
    },
    {
      type: 'chain_lightning',
      title: 'Spell: Chain Lightning',
      desc: 'Éclair en chaîne sur plusieurs ennemis.',
    },
    {
      type: 'drone',
      title: 'Ally: Drone',
      desc: 'Un drone allié tourne autour de toi et tire.',
    },
    {
      type: 'ship_interceptor',
      title: 'Ship: Interceptor',
      desc: 'Vaisseau rapide + cadence améliorée (temporaire).',
    },
    {
      type: 'ship_bomber',
      title: 'Ship: Bomber',
      desc: 'Dégâts + pierce (temporaire), mais plus lourd.',
    },
    {
      type: 'nuke',
      title: 'Explosive: Nuke',
      desc: 'Explosion massive autour de toi.',
    },
    {
      type: 'mega_nuke',
      title: 'Explosive: Mega Nuke',
      desc: 'Explosion ENORME autour de toi.',
    },
    {
      type: 'xp',
      title: 'Bonus: XP',
      desc: 'Beaucoup de gemmes XP instantanément.',
    },
    {
      type: 'repair',
      title: 'Repair',
      desc: 'Soigne et recharge un peu le bouclier.',
    },
  ];

  let a = random(pool);
  pool = pool.filter(p => p.type !== a.type);
  let b = random(pool);
  pool = pool.filter(p => p.type !== b.type);
  let c = random(pool);
  return [a, b, c];
}

class Aid {
  constructor(x, y, type) {
    this.pos = createVector(x, y);
    this.type = type;
    this.r = 16;
    this.dead = false;
    this.phase = random(1000);
  }

  update() {
    this.phase += 0.04;
  }

  draw(alpha) {
    let a = min(alpha ?? 255, 255);
    let bob = 3.5 * sin(this.phase * 1.8);

    push();
    noStroke();
    fill(80, 180, 255, min(a, 55));
    circle(this.pos.x, this.pos.y, this.r * 3.2);

    let col = [220, 240, 255];
    if (this.type === 'freeze') col = [140, 180, 255];
    else if (this.type === 'chain_lightning') col = [255, 230, 150];
    else if (this.type === 'drone') col = [190, 255, 190];
    else if (this.type === 'ship_interceptor') col = [140, 220, 255];
    else if (this.type === 'ship_bomber') col = [255, 200, 140];
    else if (this.type === 'weapon_laser') col = [190, 255, 220];
    else if (this.type === 'weapon_ion') col = [160, 220, 255];
    else if (this.type === 'repair') col = [255, 200, 200];
    else if (this.type === 'xp') col = [255, 240, 160];
    else if (this.type === 'nuke' || this.type === 'mega_nuke') col = [255, 160, 80];

    fill(col[0], col[1], col[2], a);
    circle(this.pos.x, this.pos.y + bob, this.r * 1.7);
    pop();
  }
}

function scheduleNextAid() {
  lastAidSpawnMs = millis();
  let minutes = max(0, (millis() - startMs) / 60000);
  let base = 9000;
  if (settings && settings.casual) base = 7600;
  nextAidInMs = floor(base + random(5200) - min(2600, minutes * 600));
  nextAidInMs = max(3200, nextAidInMs);
}

function trySpawnAid() {
  if (state !== 'playing') return;
  let now = millis();
  if (now - lastAidSpawnMs < nextAidInMs) return;

  scheduleNextAid();

  let pool = [
    'weapon_laser',
    'weapon_ion',
    'spell_shield',
    'freeze',
    'chain_lightning',
    'drone',
    'ship_interceptor',
    'ship_bomber',
    'repair',
    'xp',
  ];
  if (minutesSinceStart && minutesSinceStart() > 1.0) {
    pool.push('nuke');
  }

  let t = random(pool);
  let x = player.pos.x + random(-340, 340);
  let y = player.pos.y + random(-260, 260);
  aids.push(new Aid(x, y, t));
}

function minutesSinceStart() {
  return max(0, (millis() - startMs) / 60000);
}

function showAidChoice(choices) {
  state = 'aidchoice';
  overlayDiv.show();
  choicesDiv.show();
  panelDiv.html('');

  panelDiv.html(
    '<div class="ui-header">'
    + '<div>'
    + '<div class="ui-title">Star Wars: BattleSpace</div>'
    + '<div class="ui-subtitle">Récompense — choisis 1 carte</div>'
    + '</div>'
    + '<div class="ui-meta">Raccourcis: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span></div>'
    + '</div>'
  );

  choicesDiv = createDiv('');
  choicesDiv.id('choices');
  panelDiv.child(choicesDiv);

  choices.forEach((c, idx) => {
    let card = createDiv('');
    let cat = 'upgrade';
    if (c && typeof c.type === 'string') {
      if (c.type.indexOf('weapon_') === 0) cat = 'weapon';
      else if (c.type.indexOf('spell_') === 0 || c.type === 'freeze' || c.type === 'chain_lightning') cat = 'spell';
      else if (c.type.indexOf('ship_') === 0) cat = 'ship';
      else if (c.type === 'nuke' || c.type === 'mega_nuke') cat = 'explosive';
      else if (c.type === 'drone') cat = 'ally';
    }
    card.class('choice choice--' + cat);
    card.html(
      '<div class="choice-title">'
      + '<div><b>[' + (idx + 1) + ']</b> ' + c.title + '</div>'
      + '<span class="tag">' + cat + '</span>'
      + '</div>'
      + '<div style="opacity:0.9">' + c.desc + '</div>'
    );
    card.mousePressed(() => {
      applyAid(c.type);
      overlayDiv.hide();
      state = 'playing';
    });
    choicesDiv.child(card);
  });
}

function applyAid(type) {
  let now = millis();

  if (type === 'weapon_laser') {
    player.weaponMode = 'laser';
    player.weaponModeUntilMs = now + 12000;
    spawnAidScreenEffect('weapon_laser');
  } else if (type === 'weapon_ion') {
    player.weaponMode = 'ion';
    player.weaponModeUntilMs = now + 12000;
    spawnAidScreenEffect('weapon_ion');
  } else if (type === 'spell_shield') {
    player.shieldHits = (player.shieldHits || 0) + 3;
    playSfx('pickup');
    spawnAidScreenEffect('spell_shield');
  } else if (type === 'freeze') {
    freezeUntilMs = max(freezeUntilMs, now + 5200);
    playSfx('freeze');
    spawnFreezeScreenExplosion();
    addShake(3.2);
  } else if (type === 'chain_lightning') {
    spawnAidScreenEffect('chain_lightning');
    if (typeof chainLightningBurst === 'function') {
      chainLightningBurst();
    } else {
      for (let e of enemies) {
        if (!e || e.dead) continue;
        e.hp -= 22;
        e.hitUntilMs = max(e.hitUntilMs || 0, now + 110);
      }
    }
    playSfx('hit');
  } else if (type === 'drone') {
    drones.push(new Drone());
    playSfx('pickup');
  } else if (type === 'ship_interceptor') {
    player.shipType = 'interceptor';
    player.shipBuffType = 'interceptor';
    player.shipBuffUntilMs = now + 14000;
    playSfx('pickup');
    spawnAidScreenEffect('ship_interceptor');
  } else if (type === 'ship_bomber') {
    player.shipType = 'bomber';
    player.shipBuffType = 'bomber';
    player.shipBuffUntilMs = now + 14000;
    playSfx('pickup');
    spawnAidScreenEffect('ship_bomber');
  } else if (type === 'repair') {
    player.hp = min(upgrades.maxHp, player.hp + 32);
    player.shieldHits = (player.shieldHits || 0) + 1;
    playSfx('pickup');
  } else if (type === 'xp') {
    for (let i = 0; i < 18; i++) dropGem(player.pos.x + random(-60, 60), player.pos.y + random(-60, 60));
    playSfx('pickup');
  } else if (type === 'nuke' || type === 'mega_nuke') {
    playSfx('explosion');
    spawnNukeScreenExplosion(type);
    addShake(type === 'mega_nuke' ? 6.2 : 4.8);
    let rad = type === 'mega_nuke' ? 520 : 380;
    let dmg = type === 'mega_nuke' ? 320 : 220;

    {
      let rings = type === 'mega_nuke' ? 2 : 1;
      let bursts = type === 'mega_nuke' ? 14 : 9;
      for (let r = 0; r < rings; r++) {
        let rr = rad * (0.55 + r * 0.30);
        for (let i = 0; i < bursts; i++) {
          let ang = (i / bursts) * TWO_PI + random(-0.12, 0.12);
          let px = player.pos.x + cos(ang) * rr + random(-18, 18);
          let py = player.pos.y + sin(ang) * rr + random(-18, 18);
          let sm = type === 'mega_nuke' ? random(1.35, 2.1) : random(1.1, 1.75);
          let dur = type === 'mega_nuke' ? floor(random(700, 1050)) : floor(random(520, 820));
          spawnExplosion(px, py, sm, dur);
        }
      }

      spawnExplosion(player.pos.x, player.pos.y, type === 'mega_nuke' ? 2.8 : 2.0, type === 'mega_nuke' ? 1100 : 850);
    }

    for (let e of enemies) {
      if (!e || e.dead) continue;
      let d = p5.Vector.dist(e.pos, player.pos);
      if (d < rad) {
        e.hp -= dmg;
        e.hitUntilMs = max(e.hitUntilMs || 0, now + 120);
        if (e.hp <= 0) {
          killEnemy(e);
        }
      }
    }
  }
}

function showLoading() {
  state = 'loading';
  overlayDiv.show();
  choicesDiv.hide();
  panelDiv.html('');

  let h = createElement('h1', 'Chargement...');
  let p = createP('Préparation du rendu.');
  panelDiv.child(h);
  panelDiv.child(p);
}

function drawHeatShimmerAt(pos, dir, intensity, col, alpha) {
  if (!settings.heatShimmer) return;
  if (!pos || !dir) return;
  if (dir.mag() === 0) return;

  let a = min(alpha, 255) * intensity;
  if (a <= 0) return;

  let d = dir.copy().normalize();
  let perp = createVector(-d.y, d.x);
  let t = millis() * 0.001;

  push();
  blendMode(ADD);
  noFill();

  let baseW = 10 + 10 * intensity;
  for (let i = 0; i < 3; i++) {
    let s = i * 0.9;
    let wave = sin(t * 6 + s * 2.2);
    let off = perp.copy().mult(wave * (4 + 10 * intensity));
    let p0 = p5.Vector.add(pos, off);

    stroke(col[0], col[1], col[2], a * 0.10);
    strokeWeight(baseW);
    beginShape();
    for (let k = 0; k < 6; k++) {
      let u = k / 5;
      let w = sin(t * 8 + u * 10 + s);
      let pp = perp.copy().mult(w * (6 + 18 * intensity) * (1 - u));
      let back = d.copy().mult(-22 * (1 + 1.6 * intensity) * u);
      let v = p5.Vector.add(p0, p5.Vector.add(back, pp));
      vertex(v.x, v.y);
    }
    endShape();

    stroke(255, 255, 255, a * 0.06);
    strokeWeight(baseW * 0.55);
    beginShape();
    for (let k = 0; k < 6; k++) {
      let u = k / 5;
      let w = sin(t * 9 + u * 11 + s * 1.3);
      let pp = perp.copy().mult(w * (4 + 14 * intensity) * (1 - u));
      let back = d.copy().mult(-20 * (1 + 1.5 * intensity) * u);
      let v = p5.Vector.add(p0, p5.Vector.add(back, pp));
      vertex(v.x, v.y);
    }
    endShape();
  }

  blendMode(BLEND);
  pop();
}

function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.22;
    masterGain.connect(audioCtx.destination);
    startLoadingSfx();
  } catch (e) {
    audioCtx = null;
    masterGain = null;
    settings.sfx = false;
  }
}

function startLoadingSfx() {
  if (sfxLoadingStarted) return;
  if (!audioCtx) return;
  sfxLoadingStarted = true;

  let map = {
    dash: 'assets/sound/dash_sound.mp3',
    explosion: 'assets/sound/Explosion_sound.mp3',
    freeze: 'assets/sound/freeze_sound.mp3',
    hit: 'assets/sound/ennimie_sound.mp3',
    kill: 'assets/sound/detruit_sound.mp3',
    boss: 'assets/sound/Boss_sound.mp3',
    laser: 'assets/sound/laser_sound.mp3',
  };

  Object.keys(map).forEach((k) => {
    let url = encodeURI(map[k]);
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => audioCtx.decodeAudioData(buf))
      .then((audioBuf) => {
        sfxBuffers[k] = audioBuf;
      })
      .catch(() => {});
  });
}

function playSfxBuffer(key, vol = 1) {
  if (!settings.sfx) return false;
  if (!audioCtx || !masterGain) return false;
  if (audioCtx.state === 'suspended') return false;
  let buf = sfxBuffers ? sfxBuffers[key] : null;
  if (!buf) return false;

  let src = audioCtx.createBufferSource();
  src.buffer = buf;
  let g = audioCtx.createGain();
  g.gain.value = max(0, min(1, vol));
  src.connect(g);
  g.connect(masterGain);
  src.start(0);
  return true;
}

class Drone {
  constructor() {
    this.phase = random(1000);
    this.cooldownMs = 520;
    this.lastShotMs = 0;
    this.r = 7;
    this.pos = createVector(0, 0);
  }

  update(idx, total) {
    this.phase += 0.04;
    let ang = this.phase * 1.35 + (idx / max(1, total)) * TWO_PI;
    let radius = 46 + 10 * sin(this.phase * 0.7);
    this.pos.x = player.pos.x + cos(ang) * radius;
    this.pos.y = player.pos.y + sin(ang) * radius;

    let now = millis();
    if (now - this.lastShotMs < this.cooldownMs) return;
    let t = findNearestEnemy(this.pos, 700);
    if (!t) return;
    let dir = p5.Vector.sub(t.pos, this.pos);
    if (dir.mag() === 0) return;
    dir.normalize();
    projectiles.push(new Projectile(this.pos.x, this.pos.y, dir, 'laser', 0.65, 0));
    this.lastShotMs = now;
  }

  draw(alpha) {
    push();
    noStroke();
    let a = min(alpha, 200);
    fill(190, 255, 190, a * 0.22);
    circle(this.pos.x, this.pos.y, this.r * 4.2);
    fill(240, 255, 240, a);
    circle(this.pos.x, this.pos.y, this.r * 2.0);
    pop();
  }
}

function resumeAudioIfNeeded() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  startLoadingSfx();
}

function playSfx(type) {
  if (!settings.sfx) return;
  if (!audioCtx || !masterGain) return;
  if (audioCtx.state === 'suspended') return;

  if (type === 'beam') {
    if (playSfxBuffer('laser', 0.7)) return;
  } else if (type === 'freeze') {
    if (playSfxBuffer('freeze', 0.9)) return;
  } else if (type === 'dash') {
    if (playSfxBuffer('dash', 0.85)) return;
  } else if (type === 'explosion') {
    if (playSfxBuffer('explosion', 0.95)) return;
  } else if (type === 'hit') {
    if (playSfxBuffer('hit', 0.6)) return;
  } else if (type === 'kill') {
    if (playSfxBuffer('kill', 0.8)) return;
  } else if (type === 'boss') {
    if (playSfxBuffer('boss', 0.95)) return;
  }

  let now = audioCtx.currentTime;
  let o = audioCtx.createOscillator();
  let g = audioCtx.createGain();
  o.connect(g);
  g.connect(masterGain);

  let f0 = 220;
  let f1 = 60;
  let t = 0.08;
  let v = 0.22;
  let wave = 'sine';

  if (type === 'shoot') {
    f0 = 780;
    f1 = 220;
    t = 0.06;
    v = 0.14;
    wave = 'square';
  } else if (type === 'beam') {
    f0 = 520;
    f1 = 260;
    t = 0.14;
    v = 0.16;
    wave = 'sawtooth';
  } else if (type === 'hit') {
    f0 = 140;
    f1 = 60;
    t = 0.09;
    v = 0.18;
    wave = 'triangle';
  } else if (type === 'pickup') {
    f0 = 880;
    f1 = 1320;
    t = 0.11;
    v = 0.13;
    wave = 'sine';
  } else if (type === 'dash') {
    f0 = 180;
    f1 = 40;
    t = 0.07;
    v = 0.18;
    wave = 'sawtooth';
  } else if (type === 'explosion') {
    f0 = 90;
    f1 = 30;
    t = 0.16;
    v = 0.22;
    wave = 'square';
  }

  o.type = wave;
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(max(1, f1), now + t);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(v, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.start(now);
  o.stop(now + t + 0.02);
}

function addShake(power) {
  shakePower = max(shakePower, power);
  shakeUntilMs = max(shakeUntilMs, millis() + 110);
}

function spawnBeam(x, y, dir, opts) {
  if (!dir) return;
  let d = dir.copy();
  if (d.mag() === 0) d = createVector(0, -1);
  d.normalize();
  let dur = (voidBeamSettings && typeof voidBeamSettings.durationMs === 'number' && voidBeamSettings.durationMs > 0)
    ? voidBeamSettings.durationMs
    : upgrades.beamDurationMs;
  let len = (voidBeamSettings && typeof voidBeamSettings.length === 'number') ? voidBeamSettings.length : 520;
  let thick = (voidBeamSettings && typeof voidBeamSettings.thickness === 'number') ? voidBeamSettings.thickness : 10;
  let dmgMul = (voidBeamSettings && typeof voidBeamSettings.damageMul === 'number') ? voidBeamSettings.damageMul : 1.0;
  beams.push({
    x,
    y,
    dx: d.x,
    dy: d.y,
    untilMs: millis() + dur,
    durMs: dur,
    lastTickFrame: -9999,
    len,
    thick,
    dmgMul,
    followPlayer: !!(opts && opts.followPlayer),
    kind: (opts && opts.kind) ? opts.kind : 'ion',
  });
}

function updateBeams() {
  if (!beams || beams.length === 0) return;
  let now = millis();

  for (let b of beams) {
    if (!b) continue;
    if (b.followPlayer && typeof player !== 'undefined' && player && player.pos) {
      b.x = player.pos.x;
      b.y = player.pos.y;
    }
    if (b.untilMs <= now) {
      b.dead = true;
      continue;
    }

    if (frameCount - (b.lastTickFrame || 0) < 2) continue;
    b.lastTickFrame = frameCount;

    let sx = b.x;
    let sy = b.y;
    let blen = (typeof b.len === 'number') ? b.len : 520;
    let bthick = (typeof b.thick === 'number') ? b.thick : 10;
    let ex = sx + b.dx * blen;
    let ey = sy + b.dy * blen;
    let vx = ex - sx;
    let vy = ey - sy;
    let vv = vx * vx + vy * vy;
    if (vv <= 0.0001) continue;

    let baseDmg = max(2, upgrades.damage * 0.22);
    if (typeof b.dmgMul === 'number') baseDmg *= b.dmgMul;
    for (let e of enemies) {
      if (!e || e.dead) continue;
      let px = e.pos.x - sx;
      let py = e.pos.y - sy;
      let t = (px * vx + py * vy) / vv;
      if (t < 0 || t > 1) continue;
      let nx = sx + vx * t;
      let ny = sy + vy * t;
      let dx = e.pos.x - nx;
      let dy = e.pos.y - ny;
      let distSq = dx * dx + dy * dy;
      let hitR = e.r + bthick;
      if (distSq <= hitR * hitR) {
        e.hp -= baseDmg;
        e.hitUntilMs = max(e.hitUntilMs || 0, now + 70);
        if (e.hp <= 0) {
          killEnemy(e);
        }
      }
    }
  }

  beams = beams.filter(b => b && !b.dead);
}

function spawnImpact(x, y, col) {
  if (!settings.particles) return;
  let c = col || [255, 245, 190];
  for (let i = 0; i < 8; i++) {
    let v = p5.Vector.random2D().mult(random(0.6, 3.2));
    particles.push({
      kind: 'spark',
      pos: createVector(x, y),
      vel: v,
      life: random(14, 22),
      r: random(1.2, 2.8),
      col: [c[0], c[1], c[2]],
    });
  }
  particles.push({
    kind: 'ring',
    pos: createVector(x, y),
    vel: createVector(0, 0),
    life: 16,
    r: 2,
    rr: 2,
    col: [c[0], c[1], c[2]],
  });
}

function spawnThruster(x, y, dir, col) {
  if (!settings.particles) return;
  let d = dir ? dir.copy() : createVector(0, -1);
  if (d.mag() === 0) d = createVector(0, -1);
  d.normalize();
  let c = col || [140, 200, 255];
  let base = d.copy().mult(-1);
  for (let i = 0; i < 3; i++) {
    let v = base.copy().mult(random(1.4, 3.4));
    v.add(p5.Vector.random2D().mult(random(0.2, 0.9)));
    particles.push({
      kind: 'spark',
      pos: createVector(x, y),
      vel: v,
      life: random(10, 16),
      r: random(1.0, 2.2),
      col: [c[0], c[1], c[2]],
    });
  }
}

function updateParticles() {
  if (!particles || particles.length === 0) return;
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    if (!p) continue;
    p.pos.add(p.vel);
    p.vel.mult(0.96);
    p.life -= 1;
    if (p.kind === 'ring') {
      p.rr = (p.rr || 2) + 3.2;
    }
  }
  particles = particles.filter(p => p && p.life > 0);
}

function drawParticles(alpha) {
  if (!particles || particles.length === 0) return;
  let a0 = min(alpha ?? 255, 255);
  push();
  blendMode(ADD);
  noStroke();
  for (let p of particles) {
    if (!p) continue;
    let a = min(255, a0) * max(0, min(1, p.life / 22));
    if (a <= 0) continue;
    if (p.kind === 'ring') {
      noFill();
      stroke(p.col[0], p.col[1], p.col[2], a * 0.25);
      strokeWeight(3);
      circle(p.pos.x, p.pos.y, (p.rr || 2) * 2);
      noStroke();
    } else {
      fill(p.col[0], p.col[1], p.col[2], a * 0.55);
      circle(p.pos.x, p.pos.y, (p.r || 2) * 2);
    }
  }
  blendMode(BLEND);
  pop();
}

function drawBeams(alpha) {
  if (!beams || beams.length === 0) return;
  let now = millis();
  let a0 = min(alpha ?? 255, 255);
  push();
  blendMode(ADD);
  for (let b of beams) {
    if (!b) continue;
    let dur = (typeof b.durMs === 'number' && b.durMs > 0) ? b.durMs : upgrades.beamDurationMs;
    let t = max(0, min(1, (b.untilMs - now) / max(1, dur)));
    let a = a0 * (0.35 + 0.65 * t);

    let sx = b.x;
    let sy = b.y;
    let blen = (typeof b.len === 'number') ? b.len : 520;
    let bthick = (typeof b.thick === 'number') ? b.thick : 10;
    let ex = sx + b.dx * blen;
    let ey = sy + b.dy * blen;

    stroke(140, 200, 255, a * 0.25);
    strokeWeight(10 + bthick * 0.7);
    line(sx, sy, ex, ey);

    stroke(240, 250, 255, a * 0.55);
    strokeWeight(4 + bthick * 0.35);
    line(sx, sy, ex, ey);

    stroke(255, 255, 255, a);
    strokeWeight(max(2, bthick * 0.16));
    line(sx, sy, ex, ey);

    if ((b.kind === 'laser') && typeof laserSprite !== 'undefined' && laserSprite) {
      let dir = createVector(b.dx, b.dy);
      if (dir.mag() === 0) dir = createVector(0, -1);
      let heading = dir.heading() + HALF_PI;
      let sc = (bthick * 3.0) / max(1, laserSprite.height);
      let iw = laserSprite.width * sc;
      let ih = laserSprite.height * sc;
      let step = max(8, iw * 0.75);
      let count = floor(blen / step);
      count = max(1, min(30, count));

      push();
      translate(sx, sy);
      rotate(heading);
      imageMode(CENTER);
      tint(255, min(255, a * 0.95));
      for (let i = 0; i < count; i++) {
        let px = (i + 0.5) * (blen / count);
        image(laserSprite, 0, -px, iw, ih);
      }
      pop();
    }
  }
  blendMode(BLEND);
  pop();
}

function drawHyperspace(slowFactor) {
  let dir = player ? player.lastMoveDir.copy() : createVector(0, -1);
  if (dir.mag() === 0) dir = createVector(0, -1);
  dir.normalize();

  let intensity = slowFactor < 1 ? 1 : 0.6;
  let baseA = slowFactor < 1 ? 65 : 45;
  let col = slowFactor < 1 ? [160, 190, 255] : [255, 240, 180];

  push();
  stroke(col[0], col[1], col[2], baseA);
  strokeWeight(2);
  for (let i = 0; i < 26 * intensity; i++) {
    let x = random(width);
    let y = random(height);
    let len = random(20, 90) * intensity;
    let sx = x;
    let sy = y;
    let ex = x - dir.x * len;
    let ey = y - dir.y * len;
    line(sx, sy, ex, ey);
  }
  pop();
}

function chunkKey(cx, cy) {
  return cx + ',' + cy;
}

function getChunkCoords(x, y) {
  return {
    cx: floor(x / chunkSize),
    cy: floor(y / chunkSize),
  };
}

function rand01(seed) {
  let t = seed >>> 0;
  t += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randRange(seed, a, b) {
  return a + (b - a) * rand01(seed);
}

function ensurePlanetChunk(cx, cy) {
  let key = chunkKey(cx, cy);
  if (planetChunks.has(key)) return;

  let baseSeed = (cx * 928371 + cy * 523543) ^ 0xA53A9D;
  let count = floor(randRange(baseSeed + 1, 1, 3.999));
  let arr = [];

  let minGap = 160;
  let attempts = 0;
  while (arr.length < count && attempts < 120) {
    let i = arr.length;
    attempts += 1;

    let sx = rand01(baseSeed + 11 + attempts * 17);
    let sy = rand01(baseSeed + 12 + attempts * 17);

    let r = randRange(baseSeed + 13 + attempts * 17, 42, 85);
    if (rand01(baseSeed + 14 + attempts * 17) < 0.22) r = randRange(baseSeed + 15 + attempts * 17, 70, 105);

    let margin = r + minGap;
    let x = cx * chunkSize + margin + sx * max(1, (chunkSize - margin * 2));
    let y = cy * chunkSize + margin + sy * max(1, (chunkSize - margin * 2));

    let hueRoll = rand01(baseSeed + 16 + i * 17);
    let baseColor = [
      floor(80 + 140 * hueRoll),
      floor(80 + 120 * rand01(baseSeed + 21 + i * 17)),
      floor(120 + 120 * rand01(baseSeed + 22 + i * 17)),
    ];
    let atmoColor = [
      floor(80 + 160 * rand01(baseSeed + 23 + i * 17)),
      floor(120 + 120 * rand01(baseSeed + 24 + i * 17)),
      floor(160 + 90 * rand01(baseSeed + 25 + i * 17)),
    ];
    let detailColor = [255, 255, 255];
    let hasRing = rand01(baseSeed + 26 + attempts * 17) < 0.22;
    let ringTilt = randRange(baseSeed + 27 + attempts * 17, -0.9, 0.9);
    let ringColor = [
      floor(200 + 55 * rand01(baseSeed + 28 + attempts * 17)),
      floor(200 + 55 * rand01(baseSeed + 29 + attempts * 17)),
      floor(200 + 55 * rand01(baseSeed + 30 + attempts * 17)),
    ];

    let ok = true;
    for (let o of arr) {
      let d = p5.Vector.dist(o.pos, createVector(x, y));
      if (d < o.r + r + minGap) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    if (player && player.pos) {
      let d0 = p5.Vector.dist(player.pos, createVector(x, y));
      if (d0 < 320 + r) continue;
    }

    let img = planetImgs && planetImgs.length ? random(planetImgs) : null;
    arr.push(new Obstacle(x, y, r, { baseColor, detailColor, hasRing, ringTilt, ringColor, atmoColor, img }));
  }

  planetChunks.set(key, arr);
}

function ensureStarChunk(cx, cy) {
  let key = chunkKey(cx, cy);
  if (starChunks.has(key)) return;

  let baseSeed = (cx * 1000003 + cy * 10007) ^ 0xBADC0DE;
  let count = floor(randRange(baseSeed + 1, 40, 90));
  let stars = [];
  for (let i = 0; i < count; i++) {
    let sx = rand01(baseSeed + 11 + i * 13);
    let sy = rand01(baseSeed + 12 + i * 13);
    let x = cx * chunkSize + sx * chunkSize;
    let y = cy * chunkSize + sy * chunkSize;
    let r = randRange(baseSeed + 13 + i * 13, 0.8, 2.4);
    let a = floor(randRange(baseSeed + 14 + i * 13, 120, 255));
    let tint = rand01(baseSeed + 15 + i * 13);
    let col = tint < 0.6 ? [255, 255, 255] : tint < 0.8 ? [180, 220, 255] : [255, 220, 180];
    let depth = randRange(baseSeed + 16 + i * 13, 0.25, 1.0);
    stars.push({ x, y, r, a, col, depth });
  }
  starChunks.set(key, stars);
}

function refreshWorldChunks() {
  if (!player || !cameraPos) return;

  let { cx, cy } = getChunkCoords(cameraPos.x, cameraPos.y);
  let radius = 2;

  let needed = new Set();
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      let k = chunkKey(cx + dx, cy + dy);
      needed.add(k);
      ensurePlanetChunk(cx + dx, cy + dy);
      ensureStarChunk(cx + dx, cy + dy);
    }
  }

  for (let k of planetChunks.keys()) {
    if (!needed.has(k)) planetChunks.delete(k);
  }
  for (let k of starChunks.keys()) {
    if (!needed.has(k)) starChunks.delete(k);
  }

  visibleObstacles = [];
  for (let arr of planetChunks.values()) {
    for (let o of arr) visibleObstacles.push(o);
  }
}

function drawStars() {
  if (!cameraPos) return;
  push();
  noStroke();
  for (let stars of starChunks.values()) {
    for (let s of stars) {
      let x = width * 0.5 + (s.x - cameraPos.x) * s.depth;
      let y = height * 0.5 + (s.y - cameraPos.y) * s.depth;
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
      fill(s.col[0], s.col[1], s.col[2], s.a);
      circle(x, y, s.r * 2);
    }
  }
  pop();
}

function preload() {
  planetImgs = [];
  let planetPaths = [
    'assets/planet/Gas - Giant/Gas_Giant_01-256x256.png',
    'assets/planet/Gas - Giant/Gas_Giant_06-256x256.png',
    'assets/planet/Desert/Desert_02-256x256.png',
    'assets/planet/Cracked/Cracked_03-256x256.png',
    'assets/planet/Ocean/Ocean_04-256x256.png',
    'assets/planet/Ice/Ice_01-256x256.png',
    'assets/planet/Volcanic/Volcanic_05-256x256.png',
    'assets/planet/Tropical/Tropical_03-256x256.png',
  ];

  for (let p of planetPaths) {
    let url = encodeURI(p);
    planetImgs.push(loadImage(url, () => {}, () => {
      console.warn('Planet image failed to load:', url);
    }));
  }

  backgroundImgs = [];
  let bgPaths = [
    'assets/background/Blue Nebula/Blue_Nebula_01-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_02-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_03-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_04-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_05-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_06-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_07-512x512.png',
    'assets/background/Blue Nebula/Blue_Nebula_08-512x512.png',

    'assets/background/Green Nebula/Green_Nebula_01-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_02-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_03-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_04-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_05-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_06-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_07-512x512.png',
    'assets/background/Green Nebula/Green_Nebula_08-512x512.png',

    'assets/background/Purple Nebula/Purple_Nebula_01-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_02-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_03-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_04-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_05-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_06-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_07-512x512.png',
    'assets/background/Purple Nebula/Purple_Nebula_08-512x512.png',

    'assets/background/Starfields/Starfield_01-512x512.png',
    'assets/background/Starfields/Starfield_02-512x512.png',
    'assets/background/Starfields/Starfield_03-512x512.png',
    'assets/background/Starfields/Starfield_04-512x512.png',
    'assets/background/Starfields/Starfield_05-512x512.png',
    'assets/background/Starfields/Starfield_06-512x512.png',
    'assets/background/Starfields/Starfield_07-512x512.png',
    'assets/background/Starfields/Starfield_08-512x512.png',
  ];

  for (let p of bgPaths) {
    let url = encodeURI(p);
    backgroundImgs.push(loadImage(url, () => {}, () => {
      console.warn('Background failed to load:', url);
    }));
  }

  {
    let url = encodeURI('assets/Void_MainShip/Player.png');
    playerSprite = loadImage(url, () => {}, () => {
      console.warn('Player sprite failed to load:', url);
    });
  }

  playerVehicleSprites = [];
  {
    let baseUrl = encodeURI('assets/Void_MainShip/Player.png');
    playerVehicleSprites[0] = loadImage(baseUrl, () => {}, () => {
      console.warn('Player vehicle failed to load:', baseUrl);
    });
  }
  for (let i = 1; i <= 3; i++) {
    let url = encodeURI('assets/Void_MainShip/Player_' + i + '.png');
    playerVehicleSprites[i] = loadImage(url, () => {}, () => {
      console.warn('Player vehicle failed to load:', url);
    });
  }

  menaceSprites = [];
  minibossSprites = [];
  bossSprites = [];
  for (let i = 1; i <= 3; i++) {
    let u1 = encodeURI('assets/Void_MainShip/menace_' + i + '.png');
    menaceSprites[i - 1] = loadImage(u1, () => {}, () => {
      console.warn('Menace sprite failed to load:', u1);
    });

    let u2 = encodeURI('assets/Void_MainShip/miniboss_' + i + '.png');
    minibossSprites[i - 1] = loadImage(u2, () => {}, () => {
      console.warn('Miniboss sprite failed to load:', u2);
    });

    let u3 = encodeURI('assets/Void_MainShip/Boss_' + i + '.png');
    bossSprites[i - 1] = loadImage(u3, () => {}, () => {
      console.warn('Boss sprite failed to load:', u3);
    });
  }

  {
    let url = encodeURI('assets/Void_MainShip/Snake.png');
    snakeSprite = loadImage(url, () => {}, () => {
      console.warn('Snake sprite failed to load:', url);
    });
  }

  shieldSprite = null;

  laserSprite = null;
  {
    let url = encodeURI('assets/items/laser.gif');
    laserSprite = loadImage(url, () => {}, () => {
      let url2 = encodeURI('assets/items/laser.png');
      laserSprite = loadImage(url2, () => {}, () => {
        console.warn('Laser sprite failed to load:', url);
        console.warn('Laser sprite failed to load:', url2);
        laserSprite = null;
      });
    });
  }

  explosionImgs = [];
  for (let i = 1; i <= 8; i++) {
    let url = encodeURI('assets/explosion/explosion_' + i + '.gif');
    explosionImgs.push(loadImage(url, () => {}, () => {
      console.warn('Explosion failed to load:', url);
    }));
  }

  setPlayerVehicle(selectedPlayerVehicleIdx);
}

function resetGame() {
  enemies = [];
  projectiles = [];
  enemyProjectiles = [];
  gems = [];
  orbitals = [];
  whipStrikes = [];
  boomerangs = [];
  pickups = [];
  beams = [];
  aids = [];
  snakes = [];
  drones = [];
  explosions = [];

  obstacles = [];
  visibleObstacles = [];
  planetChunks = new Map();
  starChunks = new Map();
  path = null;

  upgrades = {
    damage: 10,
    fireCooldownMs: 500,
    projectileSpeed: 11,
    projectilePierce: 1,
    moveSpeed: 5.2,
    pickupRadius: 60,
    maxHp: 100,
    regenPerSec: 0,
    orbitCount: 0,
    orbitRadius: 60,
    orbitSpeed: 0.025,
    orbitDamage: 8,
    dashCooldownMs: 2200,
    dashDurationMs: 160,
    dashSpeed: 15,

    whipUnlocked: false,
    whipCooldownMs: 1400,
    whipDamage: 18,
    whipRange: 140,
    whipWidth: 46,

    auraUnlocked: false,
    auraRadius: 90,
    auraDamage: 6,
    auraTickMs: 420,

    boomerangUnlocked: false,
    boomerangCooldownMs: 1800,
    boomerangDamage: 14,
    boomerangSpeed: 12,
    boomerangPierce: 2,

    magnetDurationMs: 7000,

    tripleShotUnlocked: false,
    ionBeamUnlocked: false,
    beamCooldownMs: 900,
    beamDurationMs: 240,
  };

  player = new Player(width / 2, height / 2);
  setPlayerVehicle(selectedPlayerVehicleIdx);
  cameraPos = player.pos.copy();

  path = null;

  startMs = millis();
  warmupUntilMs = startMs + 2200;
  shimmerEnableAtMs = startMs + 4200;
  lastSpawnMs = millis();
  lastShotMs = millis();
  spawnRate = 900;
  nextBossAtMs = startMs + 60000;
  lastWhipMs = startMs;
  lastBoomerangMs = startMs;
  lastAuraTickMs = startMs;

  lastAidSpawnMs = startMs;
  scheduleNextAid();

  nextSnakeAtMs = startMs + 20000;

  slowUntilMs = 0;

  invulnPowerUntilMs = 0;
  overdriveUntilMs = 0;

  objectiveRewarded = false;
  objectiveAtMs = startMs + 45000;

  nextShopAtMs = startMs + 60000;
  shopSpent = 0;
}

function syncOrbitals() {
  if (upgrades.orbitCount < 0) upgrades.orbitCount = 0;
  while (orbitals.length < upgrades.orbitCount) {
    orbitals.push(new Orbital());
  }
  while (orbitals.length > upgrades.orbitCount) {
    orbitals.pop();
  }
}

function showMenu() {
  state = 'menu';
  warmupUntilMs = max(warmupUntilMs, millis() + 2200);
  shimmerEnableAtMs = max(shimmerEnableAtMs, millis() + 4200);
  overlayDiv.show();
  choicesDiv.hide();
  panelDiv.html('');

  let veh = (selectedPlayerVehicleIdx === 0 ? 'Default' : ('Player ' + selectedPlayerVehicleIdx));
  panelDiv.html(
    '<div class="ui-header">'
    + '<div>'
    + '<div class="ui-title">Star Wars: BattleSpace</div>'
    + '<div class="ui-subtitle">Survis aux vagues ennemies et améliore ton vaisseau</div>'
    + '</div>'
    + '<div class="ui-meta">Véhicule: <b>' + veh + '</b></div>'
    + '</div>'
    + '<div class="ui-grid">'
    + '<div class="ui-box">'
    + '<div style="opacity:0.92">Contrôles</div>'
    + '<div style="margin-top:8px;opacity:0.9">'
    + '<div><span class="kbd">ZQSD</span> bouger</div>'
    + '<div style="margin-top:6px"><span class="kbd">Shift</span> dash</div>'
    + '<div style="margin-top:6px"><span class="kbd">P</span> pause</div>'
    + '<div style="margin-top:6px"><span class="kbd">R</span> restart (game over)</div>'
    + '</div>'
    + '<div class="ui-actions">'
    + '<div class="btn"><strong>Entrée</strong> démarrer</div>'
    + '<div class="btn"><strong>1</strong>/<strong>2</strong>/<strong>3</strong> vaisseau</div>'
    + '<div class="btn"><strong>C</strong> casual: ' + (settings.casual ? 'ON' : 'OFF') + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="ui-box">'
    + '<div style="opacity:0.92">Objectif</div>'
    + '<div style="margin-top:8px;opacity:0.9">'
    + 'Ton arme tire automatiquement. Ramasse les gemmes XP pour level-up et choisir des cartes.'
    + '</div>'
    + '<div class="ui-subtitle" style="margin-top:10px">Pendant un choix: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span></div>'
    + '</div>'
    + '</div>'
  );
}

function showGameOver() {
  state = 'gameover';
  overlayDiv.show();
  choicesDiv.hide();
  panelDiv.html('');

  let survived = ((millis() - startMs) / 1000).toFixed(1);
  let veh = (selectedPlayerVehicleIdx === 0 ? 'Default' : ('Player ' + selectedPlayerVehicleIdx));
  panelDiv.html(
    '<div class="ui-header">'
    + '<div>'
    + '<div class="ui-title">Mission Failed</div>'
    + '<div class="ui-subtitle">Star Wars: BattleSpace</div>'
    + '</div>'
    + '<div class="ui-meta">Véhicule: <b>' + veh + '</b></div>'
    + '</div>'
    + '<div class="ui-box">'
    + '<div style="opacity:0.92">Bilan</div>'
    + '<div style="margin-top:8px;opacity:0.9">Survie: <b>' + survived + 's</b></div>'
    + '<div style="margin-top:6px;opacity:0.9">Appuie <span class="kbd">R</span> pour recommencer</div>'
    + '</div>'
    + '<div class="ui-actions">'
    + '<div class="btn"><strong>R</strong> restart</div>'
    + '<div class="btn"><strong>1</strong>/<strong>2</strong>/<strong>3</strong> vaisseau</div>'
    + '</div>'
  );
}

function showLevelUp(choices) {
  state = 'levelup';
  overlayDiv.show();
  choicesDiv.show();
  panelDiv.html('');

  panelDiv.html(
    '<div class="ui-header">'
    + '<div>'
    + '<div class="ui-title">Level Up</div>'
    + '<div class="ui-subtitle">Choisis une amélioration</div>'
    + '</div>'
    + '<div class="ui-meta">Raccourcis: <span class="kbd">1</span> <span class="kbd">2</span> <span class="kbd">3</span></div>'
    + '</div>'
  );

  let p = createP('Choisis une amélioration:');
  panelDiv.child(p);

  choicesDiv = createDiv('');
  choicesDiv.id('choices');
  panelDiv.child(choicesDiv);

  choices.forEach((c, idx) => {
    let card = createDiv('');
    card.class('choice choice--upgrade');
    card.html(
      '<div class="choice-title">'
      + '<div><b>[' + (idx + 1) + ']</b> ' + c.title + '</div>'
      + '<span class="tag">upgrade</span>'
      + '</div>'
      + '<div style="opacity:0.9">' + c.desc + '</div>'
    );
    card.mousePressed(() => {
      applyUpgrade(c);
      overlayDiv.hide();
      state = 'playing';
    });
    choicesDiv.child(card);
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildBackdropGfx();
}

function rebuildBackdropGfx() {
  nebulaGfx = createGraphics(width, height);
  vignetteGfx = createGraphics(width, height);
  let bs = perfTuning.bloomScale;
  bloomGfx = createGraphics(max(1, floor(width * bs)), max(1, floor(height * bs)));
  bloomGfx.pixelDensity(1);

  nebulaGfx.clear();
  nebulaGfx.noStroke();
  nebulaGfx.blendMode(ADD);
  nebulaGfx.background(0, 0);

  let seeds = [random(1000), random(1000), random(1000)];
  for (let i = 0; i < 2200; i++) {
    let x = random(width);
    let y = random(height);
    let n1 = noise(x * 0.002 + seeds[0], y * 0.002 + seeds[1]);
    let n2 = noise(x * 0.006 + seeds[1], y * 0.006 + seeds[2]);
    let d = abs(n1 - 0.52);
    if (d > 0.16) continue;
    let a = 20 + 85 * (1 - d / 0.16);
    let r = 0.6 + 3.8 * n2;

    let rr = 70 + 60 * n1;
    let gg = 80 + 70 * n2;
    let bb = 120 + 90 * (1 - n2);
    nebulaGfx.fill(rr, gg, bb, a);
    nebulaGfx.circle(x, y, r * 2);
  }
  nebulaGfx.blendMode(BLEND);

  vignetteGfx.clear();
  let vctx = vignetteGfx.drawingContext;
  let vg = vctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    min(width, height) * 0.2,
    width * 0.5,
    height * 0.5,
    max(width, height) * 0.7
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.55, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  vctx.fillStyle = vg;
  vctx.fillRect(0, 0, width, height);

  bloomGfx.clear();
  bloomGfx.image(nebulaGfx, 0, 0, bloomGfx.width, bloomGfx.height);
  bloomGfx.filter(BLUR, 2);

  planetsDecals = [];
  if (planetImgs && planetImgs.length) {
    let n = 6;
    let centerImg = random(planetImgs);
    if (centerImg) {
      planetsDecals.push({
        img: centerImg,
        x: width * 0.72,
        y: height * 0.28,
        size: min(width, height) * 0.32,
        alpha: 140,
        par: 0.02,
        rot: random(TWO_PI),
      });
    }

    for (let i = 0; i < n; i++) {
      let img = random(planetImgs);
      if (!img) continue;
      planetsDecals.push({
        img,
        x: random(-width * 0.15, width * 1.15),
        y: random(-height * 0.15, height * 0.95),
        size: random(min(width, height) * 0.16, min(width, height) * 0.42),
        alpha: random(90, 160),
        par: random(0.012, 0.045),
        rot: random(TWO_PI),
      });
    }
  }
}

function drawBloomPass() {
  if (!settings.postFx) return;
  if (!bloomGfx) return;
  push();
  blendMode(ADD);
  tint(255, 55);
  image(bloomGfx, 0, 0, width, height);
  blendMode(BLEND);
  pop();
}

function draw() {
  let warmupTop = inWarmup();
  {
    let ctx = drawingContext;
    let g = ctx.createRadialGradient(width * 0.5, height * 0.35, 10, width * 0.5, height * 0.5, max(width, height));
    g.addColorStop(0, 'rgba(25, 35, 70, 1)');
    g.addColorStop(0.55, 'rgba(8, 10, 18, 1)');
    g.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  if (!warmupTop) {
    drawDynamicBackground();
  }

  if (state === 'loading') {
    if (!loadingBuilt) {
      rebuildBackdropGfx();
      loadingBuilt = true;
      loadingDoneAtMs = millis() + 900;
      loadingStableFrames = 0;
    }

    push();
    noStroke();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    fill(255, 255, 255, 235);
    textAlign(CENTER, CENTER);
    textSize(26);
    text('Chargement...', width / 2, height / 2);
    pop();

    if (vignetteGfx) {
      push();
      blendMode(MULTIPLY);
      tint(255, 255);
      image(vignetteGfx, 0, 0);
      blendMode(BLEND);
      pop();
    }

    if (millis() >= loadingDoneAtMs) loadingStableFrames += 1;
    if (loadingStableFrames >= 6) showMenu();
    return;
  }

  if (nebulaGfx) {
    push();
    let px = (-cameraPos.x * 0.035) % width;
    let py = (-cameraPos.y * 0.035) % height;
    tint(255, 95);
    image(nebulaGfx, px, py);
    image(nebulaGfx, px - width, py);
    image(nebulaGfx, px, py - height);
    image(nebulaGfx, px - width, py - height);
    pop();
  }

  if (planetsDecals && planetsDecals.length) {
    push();
    imageMode(CENTER);
    noTint();
    for (let pl of planetsDecals) {
      if (!pl || !pl.img) continue;
      let ox = -cameraPos.x * pl.par;
      let oy = -cameraPos.y * pl.par;
      push();
      translate(pl.x + ox, pl.y + oy);
      rotate(pl.rot);
      tint(255, pl.alpha);
      image(pl.img, 0, 0, pl.size, pl.size);
      pop();
    }
    pop();
  }

  if (state === 'menu' || state === 'gameover' || state === 'levelup' || state === 'paused' || state === 'aidchoice' || state === 'shop') {
    drawWorld(true);
    drawHud();

    if (vignetteGfx) {
      push();
      blendMode(MULTIPLY);
      tint(255, 255);
      image(vignetteGfx, 0, 0);
      blendMode(BLEND);
      pop();
    }
    return;
  }

  let now = millis();

  let warmup = inWarmup();

  let freezeFactor = now < freezeUntilMs ? 0.18 : 1;

  perfState.avgFps = lerp(perfState.avgFps, frameRate(), 0.05);
  if (perfTuning.adaptiveQuality) {
    if (perfState.avgFps < perfTuning.adaptiveMinFps) {
      perfState.qualityLevel = 0;
    } else if (perfState.avgFps < perfTuning.adaptiveTargetFps - 10) {
      perfState.qualityLevel = 1;
    } else {
      perfState.qualityLevel = 2;
    }

    if (perfState.qualityLevel === 0) {
      settings.postFx = false;
      settings.heatShimmer = false;
      maxEnemies = min(maxEnemies, perfTuning.adaptiveMaxEnemiesUltraLow);
      perfTuning.maxParticles = min(perfTuning.maxParticles, 550);
    } else if (perfState.qualityLevel === 1) {
      maxEnemies = min(maxEnemies, perfTuning.adaptiveMaxEnemiesLow);
      perfTuning.maxParticles = min(perfTuning.maxParticles, 750);
    }

    if (enemies.length > maxEnemies) {
      enemies.length = maxEnemies;
    }
    if (particles.length > perfTuning.maxParticles) {
      particles.length = perfTuning.maxParticles;
    }
  }

  let slowFactor = now < slowUntilMs ? 0.45 : 1;
  slowFactor *= freezeFactor;

  refreshWorldChunks();

  trySpawnAid();

  if (state === 'playing' && now >= nextShopAtMs) {
    currentShopChoices = buildShopChoices();
    showShop(currentShopChoices);
    nextShopAtMs += 60000;
    return;
  }

  if (!warmup && (settings.hyperspace || true)) {
    drawStars();
  }

  if (!warmup && settings.hyperspace) {
    if (slowFactor < 1 || (player && player.dashingUntilMs > now)) {
      drawHyperspace(slowFactor);
    }
  }

  player.update();
  player.resolveObstacleCollisions(visibleObstacles);
  cameraPos.x = lerp(cameraPos.x, player.pos.x, 0.18);
  cameraPos.y = lerp(cameraPos.y, player.pos.y, 0.18);

  if (player && (keys.w || keys.a || keys.s || keys.d)) {
    let dir = player.lastMoveDir.copy();
    if (dir.mag() > 0) {
      let p = p5.Vector.sub(player.pos, p5.Vector.mult(dir, player.r * 0.9));
      spawnThruster(p.x, p.y, dir, [140, 200, 255]);
    }
  }

  syncOrbitals();
  for (let i = 0; i < orbitals.length; i++) {
    orbitals[i].update(i, orbitals.length);
  }

  let minutes = max(0, (now - startMs) / 60000);
  let difficulty = min(3.0, 1.0 + minutes * 0.85);
  if (settings.casual) difficulty = max(0.85, difficulty * 0.90);
  let earlyEase = 1.0 - min(1.0, minutes / 1.2);
  spawnRate = max(260, (900 / difficulty) + 420 * earlyEase);
  if (settings.casual) spawnRate = floor(spawnRate * 1.20);
  let allowedMax = maxEnemies;
  if (settings.casual) allowedMax = floor(maxEnemies * 0.78);

  if (now - lastSpawnMs >= spawnRate && enemies.length < allowedMax) {
    spawnEnemy(difficulty);
    lastSpawnMs = now;
  }

  let shotCd = upgrades.fireCooldownMs;
  if (player && millis() < player.shipBuffUntilMs) {
    if (player.shipBuffType === 'interceptor') shotCd = floor(shotCd * 0.82);
    else if (player.shipBuffType === 'bomber') shotCd = floor(shotCd * 1.08);
  }
  if (now < overdriveUntilMs) shotCd = max(90, floor(shotCd * 0.55));

  if (now - lastShotMs >= shotCd) {
    autoShoot();
    lastShotMs = now;
  }

  if (upgrades.whipUnlocked && now - lastWhipMs >= upgrades.whipCooldownMs) {
    whipStrikes.push(new WhipStrike(player.pos.x, player.pos.y, player.lastMoveDir.copy()));
    lastWhipMs = now;
  }

  if (upgrades.boomerangUnlocked && now - lastBoomerangMs >= upgrades.boomerangCooldownMs) {
    let t = findNearestEnemy(player.pos, 900);
    let dir = t ? p5.Vector.sub(t.pos, player.pos) : player.lastMoveDir.copy();
    if (dir.mag() === 0) dir = createVector(1, 0);
    dir.normalize();
    boomerangs.push(new Boomerang(player.pos.x, player.pos.y, dir));
    lastBoomerangMs = now;
  }

  if (upgrades.auraUnlocked && now - lastAuraTickMs >= upgrades.auraTickMs) {
    for (let e of enemies) {
      if (e.dead) continue;
      let d = p5.Vector.dist(e.pos, player.pos);
      if (d < upgrades.auraRadius + e.r) {
        e.hp -= upgrades.auraDamage;
        if (e.hp <= 0) {
          killEnemy(e);
        }
      }
    }
    lastAuraTickMs = now;
  }

  if (now >= nextBossAtMs) {
    spawnBoss();
    nextBossAtMs += 60000;
  }

  if (now >= nextSnakeAtMs) {
    spawnSnake();
    nextSnakeAtMs = now + 26000 + random(14000);
  }

  for (let e of enemies) {
    e.seekWeight = behaviorTuning.enemySeek;
    e.avoidWeight = behaviorTuning.enemyAvoid;
    e.pathWeight = behaviorTuning.enemyFollow;
    if (e.behaviorManager) {
      if (behaviorTuning.enemyAvoidActive) e.behaviorManager.activate('avoidObstacles');
      else e.behaviorManager.deactivate('avoidObstacles');
      if (behaviorTuning.enemyFollowActive) e.behaviorManager.activate('followPath');
      else e.behaviorManager.deactivate('followPath');
    }
    e.update(visibleObstacles, path, enemyProjectiles, slowFactor);
  }
  for (let s of snakes) s.update(visibleObstacles, player.pos, slowFactor);
  for (let p of projectiles) p.update();
  for (let ep of enemyProjectiles) ep.update(slowFactor);
  for (let i = 0; i < drones.length; i++) drones[i].update(i, drones.length);
  for (let g of gems) g.update();
  for (let ex of explosions) ex.update();
  for (let fx of screenEffects) fx.update();
  for (let w of whipStrikes) w.update();
  for (let b of boomerangs) b.update();
  for (let pk of pickups) pk.update();
  for (let a of aids) a.update();

  updateBeams();

  updateParticles();

  handleCollisions();

  enemies = enemies.filter(e => !e.dead);
  projectiles = projectiles.filter(p => !p.dead);
  enemyProjectiles = enemyProjectiles.filter(p => !p.dead);
  gems = gems.filter(g => !g.dead);
  explosions = explosions.filter(ex => ex && !ex.dead);
  screenEffects = screenEffects.filter(fx => fx && !fx.dead);
  whipStrikes = whipStrikes.filter(w => !w.dead);
  boomerangs = boomerangs.filter(b => !b.dead);
  pickups = pickups.filter(p => !p.dead);
  aids = aids.filter(a => !a.dead);

  drawWorld(false);
  if (!warmup) {
    drawBloomPass();
  }
  drawMiniMap();

  for (let fx of screenEffects) fx.draw();

  drawHud();

  if (vignetteGfx) {
    push();
    blendMode(MULTIPLY);
    tint(255, 255);
    image(vignetteGfx, 0, 0);
    blendMode(BLEND);
    pop();
  }

  if (slowFactor < 1) {
    push();
    noStroke();
    fill(140, 160, 255, 25);
    rect(0, 0, width, height);
    pop();
  }

  if (player.hp <= 0) {
    showGameOver();
  }

  if (!objectiveRewarded && now >= objectiveAtMs) {
    pickups.push(new Pickup(player.pos.x + random(-160, 160), player.pos.y + random(-160, 160), 'shield'));
    objectiveRewarded = true;
  }
}

function drawWorld(ghost) {
  let alpha = ghost ? 90 : 255;

  push();
  let now = millis();
  let sx = 0;
  let sy = 0;
  if (now < shakeUntilMs) {
    sx = random(-shakePower, shakePower);
    sy = random(-shakePower, shakePower);
  } else {
    shakePower *= 0.88;
  }
  translate(width / 2 - cameraPos.x + sx, height / 2 - cameraPos.y + sy);

  if (path) {
    path.show();
  }
  visibleObstacles.forEach(o => o.show());

  for (let g of gems) (g.show ? g.show(alpha) : g.draw(alpha));
  for (let pk of pickups) (pk.show ? pk.show(alpha) : pk.draw(alpha));
  for (let a of aids) (a.show ? a.show(alpha) : a.draw(alpha));
  for (let d of drones) (d.show ? d.show(alpha) : d.draw(alpha));
  for (let o of orbitals) (o.show ? o.show(alpha) : o.draw(alpha));
  for (let w of whipStrikes) (w.show ? w.show(alpha) : w.draw(alpha));
  for (let b of boomerangs) (b.show ? b.show(alpha) : b.draw(alpha));
  for (let p of projectiles) (p.show ? p.show(alpha) : p.draw(alpha));
  for (let ep of enemyProjectiles) (ep.show ? ep.show(alpha) : ep.draw(alpha));
  drawBeams(alpha);
  for (let s of snakes) (s.show ? s.show(alpha) : s.draw(alpha));
  for (let e of enemies) (e.show ? e.show(alpha) : e.draw(alpha));
  for (let ex of explosions) (ex.show ? ex.show(alpha) : ex.draw(alpha));
  (player.show ? player.show(alpha) : player.draw(alpha));

  if (!ghost && player && player.weaponModeUntilMs && millis() < player.weaponModeUntilMs) {
    let now = millis();
    let t = max(0, min(1, (player.weaponModeUntilMs - now) / 12000));
    let a = 210 * (0.35 + 0.65 * t);
    let laser = player.weaponMode === 'laser';
    let col = laser ? [140, 210, 255] : [180, 235, 255];
    let col2 = laser ? [255, 255, 255] : [220, 250, 255];
    let r = max(24, player.r * 1.45);
    push();
    blendMode(ADD);
    noFill();
    stroke(col[0], col[1], col[2], a * (laser ? 0.70 : 0.55));
    strokeWeight(laser ? 7 : 6);
    circle(player.pos.x, player.pos.y, r * 2);
    stroke(col2[0], col2[1], col2[2], a * 0.55);
    strokeWeight(2);
    circle(player.pos.x, player.pos.y, r * 2.35);
    blendMode(BLEND);
    pop();
  }

  if (!ghost && player && player.shipBuffUntilMs && millis() < player.shipBuffUntilMs) {
    let now = millis();
    let t = max(0, min(1, (player.shipBuffUntilMs - now) / 14000));
    let a = 210 * (0.35 + 0.65 * t);
    let col = (player.shipBuffType === 'bomber') ? [255, 170, 90] : [120, 255, 180];
    let col2 = (player.shipBuffType === 'bomber') ? [255, 240, 190] : [200, 255, 230];
    let r = max(26, player.r * 1.65);
    push();
    blendMode(ADD);
    noFill();
    stroke(col[0], col[1], col[2], a * 0.55);
    strokeWeight(8);
    circle(player.pos.x, player.pos.y, r * 2);
    stroke(col2[0], col2[1], col2[2], a * 0.85);
    strokeWeight(3);
    circle(player.pos.x, player.pos.y, r * 2.32);
    stroke(255, 255, 255, a * 0.35);
    strokeWeight(2);
    circle(player.pos.x, player.pos.y, r * 2.52);
    blendMode(BLEND);
    pop();
  }

  if (!ghost && settings.heatShimmer && millis() >= shimmerEnableAtMs && frameCount % perfTuning.shimmerEveryNFrames === 0) {
    let now = millis();
    if (player && (keys.w || keys.a || keys.s || keys.d || (player && player.dashingUntilMs > now))) {
      let dir = player.lastMoveDir.copy();
      if (dir.mag() === 0) dir = createVector(0, -1);
      let p = p5.Vector.sub(player.pos, p5.Vector.mult(dir, player.r * 0.95));
      let intensity = player.dashingUntilMs > now ? 1.0 : 0.7;
      drawHeatShimmerAt(p, dir, intensity, [140, 200, 255], alpha);
    }

    let shimmerCount = 0;
    let maxDistSq = perfTuning.shimmerMaxDist * perfTuning.shimmerMaxDist;
    for (let e of enemies) {
      if (!e || e.dead) continue;
      if (shimmerCount >= perfTuning.shimmerMaxEnemies) break;
      if (player) {
        let dxp = e.pos.x - player.pos.x;
        let dyp = e.pos.y - player.pos.y;
        if (dxp * dxp + dyp * dyp > maxDistSq) continue;
      }
      let v = e.vel.copy();
      if (v.mag() < 0.35) continue;
      let dir = v.copy().normalize();
      let p = p5.Vector.sub(e.pos, p5.Vector.mult(dir, e.r * 0.9));
      drawHeatShimmerAt(p, dir, 0.55, [140, 200, 255], alpha);
      shimmerCount += 1;
    }
  }

  drawParticles(alpha);

  pop();
}

function drawHud() {
  if (frameCount - lastHudFrame < perfTuning.hudEveryNFrames) return;
  lastHudFrame = frameCount;
  let survived = ((millis() - startMs) / 1000).toFixed(1);
  let bossIn = max(0, Math.ceil((nextBossAtMs - millis()) / 1000));
  let slowIn = max(0, Math.ceil((slowUntilMs - millis()) / 1000));
  let wMode = player && player.weaponMode ? player.weaponMode.toUpperCase() : 'BLASTER';
  let weaponIn = player ? max(0, Math.ceil((player.weaponModeUntilMs - millis()) / 1000)) : 0;
  let ship = player && player.shipType ? player.shipType.toUpperCase() : 'FIGHTER';
  let shipIn = player ? max(0, Math.ceil((player.shipBuffUntilMs - millis()) / 1000)) : 0;

  let dashReadyIn = 0;
  if (player) {
    dashReadyIn = max(0, Math.ceil((player.nextDashAtMs - millis()) / 1000));
  }

  let hpPct = max(0, min(1, player.hp / upgrades.maxHp));
  let xpPct = max(0, min(1, player.xp / player.xpToNext));

  let html = '';
  html += '<div style="opacity:0.9">FPS: ' + perfState.avgFps.toFixed(0) + ' | Quality: ' + (perfState.qualityLevel === 2 ? 'HIGH' : perfState.qualityLevel === 1 ? 'LOW' : 'ULTRA-LOW') + '</div>';
  html += '<div><b>Niveau</b>: ' + player.level + ' &nbsp; <b>Temps</b>: ' + survived + 's</div>';
  html += '<div style="margin-top:8px"><b>HP</b>: ' + Math.ceil(player.hp) + ' / ' + upgrades.maxHp + '</div>';
  html += '<div class="bar hp"><div style="width:' + Math.floor(hpPct * 100) + '%"></div></div>';
  html += '<div><b>XP</b>: ' + player.xp + ' / ' + player.xpToNext + '</div>';
  html += '<div class="bar xp"><div style="width:' + Math.floor(xpPct * 100) + '%"></div></div>';
  html += '<div style="opacity:0.9">Ennemis: ' + enemies.length + ' &nbsp; Projectiles: ' + projectiles.length + '</div>';
  let magnetOn = player && player.magnetUntilMs > millis();
  html += '<div style="opacity:0.9">Dash: ' + (dashReadyIn === 0 ? 'READY' : dashReadyIn + 's') + ' &nbsp; Boss: ' + bossIn + 's</div>';
  html += '<div style="opacity:0.9">Whip: ' + (upgrades.whipUnlocked ? 'ON' : 'OFF') + ' | Aura: ' + (upgrades.auraUnlocked ? 'ON' : 'OFF') + ' | Boomerang: ' + (upgrades.boomerangUnlocked ? 'ON' : 'OFF') + ' | Magnet: ' + (magnetOn ? 'ON' : 'OFF') + ' | Slow: ' + (slowIn > 0 ? slowIn + 's' : 'OFF') + '</div>';
  html += '<div style="opacity:0.9">Shield: ' + (player.shieldHits > 0 ? player.shieldHits : '0') + ' &nbsp; Objectif: ' + (objectiveRewarded ? 'OK' : Math.ceil(max(0, (objectiveAtMs - millis()) / 1000)) + 's') + '</div>';
  let inv = invulnPowerUntilMs > millis();
  let od = overdriveUntilMs > millis();
  html += '<div style="opacity:0.9">Invuln: ' + (inv ? 'ON' : 'OFF') + ' &nbsp; Overdrive: ' + (od ? 'ON' : 'OFF') + '</div>';
  html += '<div style="opacity:0.9">Ship: ' + ship + (shipIn > 0 ? ' (' + shipIn + 's)' : '') + ' &nbsp; Weapon: ' + wMode + (weaponIn > 0 ? ' (' + weaponIn + 's)' : '') + '</div>';
  html += '<div style="opacity:0.9">Options: Casual(' + (settings.casual ? 'ON' : 'OFF') + ') SFX(' + (settings.sfx ? 'ON' : 'OFF') + ') Particles(' + (settings.particles ? 'ON' : 'OFF') + ') Hyper(' + (settings.hyperspace ? 'ON' : 'OFF') + ') PostFX(' + (settings.postFx ? 'ON' : 'OFF') + ') Shimmer(' + (settings.heatShimmer ? 'ON' : 'OFF') + ')</div>';
  html += '<div style="opacity:0.9">Behaviors Enemy: seek(' + behaviorTuning.enemySeek.toFixed(2) + ') avoid(' + behaviorTuning.enemyAvoid.toFixed(2) + (behaviorTuning.enemyAvoidActive ? '' : ' OFF') + ') follow(' + behaviorTuning.enemyFollow.toFixed(2) + (behaviorTuning.enemyFollowActive ? '' : ' OFF') + ')</div>';
  html += '<div style="opacity:0.9">Touches: <span class="kbd">P</span> pause, <span class="kbd">R</span> reset, <span class="kbd">M</span> mute, <span class="kbd">G</span> particles, <span class="kbd">H</span> hyper, <span class="kbd">C</span> casual</div>';

  hudDiv.html(html);
}

function drawMiniMap() {
  // Mini-map: overlay en screen-space (top-right), basée sur cameraPos + entités visibles.
  if (!cameraPos) return;
  let w = 190;
  let h = 130;
  let pad = 14;
  let x0 = width - w - pad;
  let y0 = pad;
  let scale = 0.085;

  push();
  stroke(255, 230, 160, 185);
  strokeWeight(2);
  fill(0, 0, 0, 165);
  rect(x0, y0, w, h, 12);

  noStroke();
  fill(255, 230, 160, 155);
  textAlign(LEFT, TOP);
  textSize(11);
  text('MAP', x0 + 10, y0 + 8);

  let cx = x0 + w * 0.5;
  let cy = y0 + h * 0.5;

  fill(255, 255, 255, 220);
  circle(cx, cy, 6);

  fill(120, 220, 255, 100);
  for (let o of visibleObstacles) {
    if (!o) continue;
    let dx = (o.pos.x - cameraPos.x) * scale;
    let dy = (o.pos.y - cameraPos.y) * scale;
    if (abs(dx) > w * 0.6 || abs(dy) > h * 0.6) continue;
    circle(cx + dx, cy + dy, max(2, o.r * scale * 2));
  }

  fill(255, 90, 90, 170);
  for (let e of enemies) {
    if (!e || e.dead) continue;
    let dx = (e.pos.x - cameraPos.x) * scale;
    let dy = (e.pos.y - cameraPos.y) * scale;
    if (abs(dx) > w * 0.6 || abs(dy) > h * 0.6) continue;
    circle(cx + dx, cy + dy, 2.5);
  }

  pop();
}

function spawnEnemy(difficulty) {
  let edge = floor(random(4));
  let x = 0;
  let y = 0;
  let pad = 80;
  let left = cameraPos.x - width / 2 - pad;
  let right = cameraPos.x + width / 2 + pad;
  let top = cameraPos.y - height / 2 - pad;
  let bottom = cameraPos.y + height / 2 + pad;
  if (edge === 0) { x = random(left, right); y = top; }
  if (edge === 1) { x = right; y = random(top, bottom); }
  if (edge === 2) { x = random(left, right); y = bottom; }
  if (edge === 3) { x = left; y = random(top, bottom); }

  let e = new Enemy(x, y);
  let minutes = max(0, (millis() - startMs) / 60000);
  let earlyEase = 1.0 - min(1.0, minutes / 1.2);
  let baseSpeed = 1.6 + random(0.25, 0.95) * difficulty;
  let baseHp = 12 + floor(random(0, 9)) + floor(7 * (difficulty - 1));
  baseHp = floor(baseHp * (1.0 - 0.18 * earlyEase));
  let baseDmg = 6 + floor(4 * (difficulty - 1));
  baseDmg = floor(baseDmg * (1.0 - 0.25 * earlyEase));

  if (settings.casual) {
    baseHp = floor(baseHp * 0.85);
    baseDmg = floor(baseDmg * 0.80);
    baseSpeed *= 0.95;
  }

  e.maxSpeed = baseSpeed;
  e.hp = baseHp;
  e.maxHp = e.hp;
  e.touchDamage = baseDmg;

  e.variant = random() < 0.22 ? 'ufo' : 'ship';

  e.pathWeight = 0.0;

  // Variantes aléatoires (space mobs)
  let roll = random();
  if (roll < 0.18) {
    // sprinter
    e.r = 11;
    e.maxSpeed *= 1.45;
    e.hp = floor(e.hp * 0.8);
    e.maxHp = e.hp;
    e.touchDamage = floor(e.touchDamage * 0.9);
    if (random() < 0.35) e.variant = 'ufo';
  } else if (roll < 0.34) {
    // tank
    e.r = 20;
    e.maxSpeed *= 0.75;
    e.hp = floor(e.hp * 2.0);
    e.maxHp = e.hp;
    e.touchDamage = floor(e.touchDamage * 1.2);
    e.variant = 'ufo';
  } else if (roll < 0.48) {
    // ranged
    e.isRanged = true;
    e.r = 14;
    e.maxSpeed *= 1.05;
    e.hp = floor(e.hp * 1.25);
    e.maxHp = e.hp;
    e.touchDamage = floor(e.touchDamage * 0.7);
    e.variant = random() < 0.6 ? 'ufo' : 'ship';
  }

  if (random() < min(0.22, 0.06 + (difficulty - 1) * 0.08)) {
    e.isElite = true;
    e.r += 3;
    e.maxSpeed *= 1.15;
    e.hp = floor(e.hp * 1.9);
    e.maxHp = e.hp;
    e.touchDamage = floor(e.touchDamage * 1.45);
    if (random() < 0.5) e.variant = 'ufo';
  }

  enemies.push(e);
}

function spawnBoss() {
  let edge = floor(random(4));
  let x = 0;
  let y = 0;
  let pad = 200;
  let left = cameraPos.x - width / 2 - pad;
  let right = cameraPos.x + width / 2 + pad;
  let top = cameraPos.y - height / 2 - pad;
  let bottom = cameraPos.y + height / 2 + pad;
  if (edge === 0) { x = random(left, right); y = top; }
  if (edge === 1) { x = right; y = random(top, bottom); }
  if (edge === 2) { x = random(left, right); y = bottom; }
  if (edge === 3) { x = left; y = random(top, bottom); }

  let b = new Enemy(x, y);
  b.isBoss = true;
  playSfx('boss');
  b.r = 32;
  b.maxSpeed = 1.6;
  b.maxForce = 0.18;
  b.hp = 520 + floor((millis() - startMs) / 1000) * 2;
  b.maxHp = b.hp;
  b.touchDamage = 22;
  b.isElite = true;
  enemies.push(b);
}

function spawnSnake() {
  let edge = floor(random(4));
  let x = 0;
  let y = 0;
  let pad = 120;
  let left = cameraPos.x - width / 2 - pad;
  let right = cameraPos.x + width / 2 + pad;
  let top = cameraPos.y - height / 2 - pad;
  let bottom = cameraPos.y + height / 2 + pad;
  if (edge === 0) { x = random(left, right); y = top; }
  if (edge === 1) { x = right; y = random(top, bottom); }
  if (edge === 2) { x = random(left, right); y = bottom; }
  if (edge === 3) { x = left; y = random(top, bottom); }

  let len = floor(random(7, 12));
  snakes.push(new Snake(x, y, len));
}

function autoShoot() {
  let target = findNearestEnemy(player.pos, 800);
  if (!target) return;

  let dir = p5.Vector.sub(target.pos, player.pos);
  if (dir.mag() === 0) return;
  dir.normalize();

  let mode = (player && player.weaponMode) ? player.weaponMode : 'blaster';

  if (mode === 'laser') {
    let now = millis();
    if (now - (autoShoot.lastLaserBeamMs || 0) < 90) return;
    autoShoot.lastLaserBeamMs = now;

    voidBeamSettings.length = 680;
    voidBeamSettings.thickness = 14;
    voidBeamSettings.damageMul = 0.55;
    voidBeamSettings.durationMs = 140;
    spawnBeam(player.pos.x, player.pos.y, dir, { followPlayer: true, kind: 'laser' });
    playSfx('beam');
    addShake(0.25);
    return;
  }

  if (upgrades.ionBeamUnlocked && millis() - (autoShoot.lastBeamMs || 0) >= upgrades.beamCooldownMs) {
    spawnBeam(player.pos.x, player.pos.y, dir);
    autoShoot.lastBeamMs = millis();
    playSfx('beam');
    addShake(0.9);
    return;
  }

  let tripleActive = upgrades.tripleShotUnlocked || (player && millis() < player.tempTripleUntilMs);

  let damageMul = 1;
  let pierceBonus = 0;
  if (player && millis() < player.shipBuffUntilMs) {
    if (player.shipBuffType === 'bomber') {
      damageMul = 1.22;
      pierceBonus = 1;
    }
  }

  if (tripleActive) {
    let spread = 0.22;
    for (let i = -1; i <= 1; i++) {
      let dd = dir.copy();
      dd.rotate(i * spread);
      let p = new Projectile(player.pos.x, player.pos.y, dd, mode, damageMul, pierceBonus);
      projectiles.push(p);
    }
    playSfx('shoot');
    return;
  }

  let p = new Projectile(player.pos.x, player.pos.y, dir, mode, damageMul, pierceBonus);
  projectiles.push(p);
  playSfx('shoot');
}

function circlesCollide(p0, r0, p1, r1) {
  return p5.Vector.dist(p0, p1) < (r0 + r1);
}

function buildEnemyGrid(cellSize = 140) {
  let grid = new Map();
  for (let e of enemies) {
    if (!e || e.dead) continue;
    let cx = floor(e.pos.x / cellSize);
    let cy = floor(e.pos.y / cellSize);
    let k = cx + ',' + cy;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(e);
  }
  return { grid, cellSize };
}

function handleCollisions() {
  let { grid: enemyGrid, cellSize } = buildEnemyGrid(140);

  for (let e of enemies) {
    if (e.dead) continue;

    let d = p5.Vector.dist(e.pos, player.pos);
    if (d < e.r + player.r) {
      if (player.invulnerableUntilMs > millis()) {
        continue;
      }
      player.takeDamage(e.touchDamage);
      addShake(2.2);
      playSfx('hit');
      let pushDir = p5.Vector.sub(player.pos, e.pos);
      if (pushDir.mag() > 0) {
        pushDir.setMag(6);
        player.pos.add(pushDir);
      }
    }
  }

  for (let ep of enemyProjectiles) {
    if (ep.dead) continue;
    let d = p5.Vector.dist(ep.pos, player.pos);
    if (d < ep.r + player.r) {
      if (player.invulnerableUntilMs <= millis()) {
        player.takeDamage(ep.damage);
        addShake(1.6);
        playSfx('hit');
      }
      spawnImpact(ep.pos.x, ep.pos.y, [255, 90, 90]);
      ep.dead = true;
    }
  }

  for (let s of snakes) {
    if (s.dead) continue;
    for (let seg of s.segments) {
      if (seg.dead) continue;
      if (circlesCollide(seg.pos, seg.r, player.pos, player.r)) {
        if (player.invulnerableUntilMs > millis()) {
          continue;
        }
        player.takeDamage(s.touchDamage);
        addShake(2.0);
        playSfx('hit');
        let pushDir = p5.Vector.sub(player.pos, seg.pos);
        if (pushDir.mag() > 0) {
          pushDir.setMag(6);
          player.pos.add(pushDir);
        }
      }
    }
  }

  // Orbitals collision (dégâts en continu)
  for (let o of orbitals) {
    let cx = floor(o.pos.x / cellSize);
    let cy = floor(o.pos.y / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let arr = enemyGrid.get((cx + dx) + ',' + (cy + dy));
        if (!arr) continue;
        for (let e of arr) {
          if (e.dead) continue;
          let d = p5.Vector.dist(o.pos, e.pos);
          if (d < o.r + e.r) {
            e.hp -= o.damage;
            e.hitUntilMs = max(e.hitUntilMs || 0, millis() + 70);
            spawnImpact(e.pos.x, e.pos.y, [255, 245, 190]);
            if (random() < 0.25) addShake(0.7);
            if (e.hp <= 0) {
              killEnemy(e);
            }
          }
        }
      }
    }
  }

  for (let p of projectiles) {
    if (p.dead) continue;

    let cx = floor(p.pos.x / cellSize);
    let cy = floor(p.pos.y / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        let arr = enemyGrid.get((cx + dx) + ',' + (cy + dy));
        if (!arr) continue;
        for (let e of arr) {
          if (e.dead) continue;
          let d = p5.Vector.dist(p.pos, e.pos);
          if (d < p.r + e.r) {
            if (p.hitIds.has(e.id)) continue;
            p.hitIds.add(e.id);

            e.hp -= p.damage;
            e.hitUntilMs = max(e.hitUntilMs || 0, millis() + 95);
            spawnImpact(p.pos.x, p.pos.y, [255, 245, 190]);
            addShake(0.9);
            playSfx('hit');
            p.pierceLeft -= 1;

            let knock = p5.Vector.sub(e.pos, p.pos);
            if (knock.mag() > 0) {
              knock.setMag(0.9);
              e.pos.add(knock);
            }

            if (e.hp <= 0) {
              killEnemy(e);
            }

            if (p.pierceLeft < 0) {
              p.dead = true;
              break;
            }
          }
        }
        if (p.dead) break;
      }
      if (p.dead) break;
    }

    if (p.dead) continue;
    for (let s of snakes) {
      if (s.dead) continue;
      for (let seg of s.segments) {
        if (seg.dead) continue;
        if (circlesCollide(p.pos, p.r, seg.pos, seg.r)) {
          seg.hp -= p.damage;
          spawnImpact(p.pos.x, p.pos.y, [255, 245, 190]);
          addShake(0.7);
          playSfx('hit');
          p.pierceLeft -= 1;
          if (seg.hp <= 0) {
            seg.dead = true;
          }
          if (p.pierceLeft < 0) {
            p.dead = true;
          }
          if (p.dead) break;
        }
      }
      if (p.dead) break;
    }
  }

  for (let g of gems) {
    if (g.dead) continue;
    let d = p5.Vector.dist(g.pos, player.pos);
    let rad = upgrades.pickupRadius;
    if (player.magnetUntilMs > millis()) {
      rad = max(rad, 220);
    }
    if (d < rad) {
      let pull = p5.Vector.sub(player.pos, g.pos);
      pull.setMag(0.8);
      g.pos.add(pull);
    }
    if (d < g.r + player.r) {
      g.dead = true;
      player.gainXp(g.value);
      if (random() < 0.25) playSfx('pickup');
    }
  }

  for (let pk of pickups) {
    if (pk.dead) continue;
    let d = p5.Vector.dist(pk.pos, player.pos);
    let rad = upgrades.pickupRadius;
    if (player.magnetUntilMs > millis()) {
      rad = max(rad, 220);
    }
    if (d < rad) {
      let pull = p5.Vector.sub(player.pos, pk.pos);
      pull.setMag(0.9);
      pk.pos.add(pull);
    }
    if (d < pk.r + player.r) {
      pk.dead = true;
      applyPickup(pk.type);
      playSfx('pickup');
    }
  }

  for (let a of aids) {
    if (a.dead) continue;
    let d = p5.Vector.dist(a.pos, player.pos);
    if (d < a.r + player.r + 4) {
      a.dead = true;
      currentAidChoices = buildAidChoices();
      showAidChoice(currentAidChoices);
    }
  }

  snakes = snakes.filter(s => !s.dead);
}

function dropGem(x, y) {
  let value = 1;
  if (random() < 0.15) value = 2;
  if (random() < 0.05) value = 4;
  gems.push(new Gem(x + random(-6, 6), y + random(-6, 6), value));
}

function dropGemsForEnemy(enemy) {
  if (enemy.isBoss) {
    for (let i = 0; i < 18; i++) {
      let v = 2;
      if (random() < 0.35) v = 4;
      gems.push(new Gem(enemy.pos.x + random(-35, 35), enemy.pos.y + random(-35, 35), v));
    }
    return;
  }
  if (enemy.isElite) {
    dropGem(enemy.pos.x, enemy.pos.y);
    dropGem(enemy.pos.x + random(-10, 10), enemy.pos.y + random(-10, 10));
    if (random() < 0.35) dropGem(enemy.pos.x + random(-10, 10), enemy.pos.y + random(-10, 10));
  } else {
    dropGem(enemy.pos.x, enemy.pos.y);
  }

  let minutes = max(0, (millis() - startMs) / 60000);
  let earlyEase = 1.0 - min(1.0, minutes / 1.3);
  let dropChance = (enemy.isElite ? 0.14 : 0.06) + (enemy.isElite ? 0.06 : 0.10) * earlyEase;
  if (settings.casual) dropChance += 0.05;
  if (random() < dropChance) {
    let r = random();
    let type = 'heal';
    let healBias = 0.12 * earlyEase;
    if (settings.casual) healBias += 0.10;
    if (r < 0.34 + healBias) type = 'heal';
    else if (r < 0.64 + healBias) type = 'magnet';
    else if (r < 0.82 + healBias) type = 'bomb';
    else if (r < 0.90 + healBias) type = 'shield';
    else if (r < 0.96) type = 'slow';
    else if (r < 0.985) type = 'invuln';
    else type = 'overdrive';
    pickups.push(new Pickup(enemy.pos.x + random(-8, 8), enemy.pos.y + random(-8, 8), type));
  }
}

function applyPickup(type) {
  if (type === 'heal') {
    player.hp = min(upgrades.maxHp, player.hp + 28);
  } else if (type === 'magnet') {
    player.magnetUntilMs = millis() + upgrades.magnetDurationMs;
  } else if (type === 'bomb') {
    playSfx('explosion');
    addShake(4.2);
    for (let e of enemies) {
      if (!e || e.dead) continue;
      let d = p5.Vector.dist(e.pos, player.pos);
      if (d < upgrades.whipRange + e.r) {
        e.hp -= upgrades.whipDamage;
        e.hitUntilMs = max(e.hitUntilMs || 0, millis() + 110);
        spawnImpact(e.pos.x, e.pos.y, [255, 160, 80]);
        if (e.hp <= 0) {
          killEnemy(e);
        }
      }
    }
  } else if (type === 'shield') {
    player.shieldHits = min(3, player.shieldHits + 1);
  } else if (type === 'slow') {
    slowUntilMs = max(slowUntilMs, millis() + 6500);
  } else if (type === 'invuln') {
    invulnPowerUntilMs = max(invulnPowerUntilMs, millis() + 3200);
    player.invulnerableUntilMs = max(player.invulnerableUntilMs, millis() + 3200);
  } else if (type === 'overdrive') {
    overdriveUntilMs = max(overdriveUntilMs, millis() + 6200);
  }
}

function findNearestEnemy(pos, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (let e of enemies) {
    if (e.dead) continue;
    let d = p5.Vector.dist(pos, e.pos);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function applyUpgrade(up) {
  up.apply();
  player.level += 1;
}

function buildUpgradeChoices() {
  let pool = [
    {
      id: 'damage',
      title: 'Damage +5',
      desc: 'Augmente les dégâts des projectiles.',
      apply: () => { upgrades.damage += 5; },
    },
    {
      id: 'fire',
      title: 'Fire rate +20%',
      desc: 'Tire plus souvent.',
      apply: () => { upgrades.fireCooldownMs = max(120, floor(upgrades.fireCooldownMs * 0.8)); },
    },
    {
      id: 'speed',
      title: 'Move speed +10%',
      desc: 'Bouge plus vite.',
      apply: () => { upgrades.moveSpeed *= 1.1; },
    },
    {
      id: 'proj',
      title: 'Projectile speed +15%',
      desc: 'Projectiles plus rapides.',
      apply: () => { upgrades.projectileSpeed *= 1.15; },
    },
    {
      id: 'pierce',
      title: 'Pierce +1',
      desc: 'Traverse plus d’ennemis.',
      apply: () => { upgrades.projectilePierce += 1; },
    },
    {
      id: 'pickup',
      title: 'Pickup radius +20',
      desc: 'Attire les gemmes de plus loin.',
      apply: () => { upgrades.pickupRadius += 20; },
    },
    {
      id: 'hp',
      title: 'Max HP +25',
      desc: 'Plus de vie.',
      apply: () => { upgrades.maxHp += 25; player.hp += 25; },
    },
    {
      id: 'regen',
      title: 'Regen +0.5 HP/s',
      desc: 'Régénération lente.',
      apply: () => { upgrades.regenPerSec += 0.5; },
    },
    {
      id: 'orbit_unlock',
      title: 'Orbitals: +1',
      desc: 'Ajoute un couteau/orbe orbital autour de toi.',
      apply: () => { upgrades.orbitCount += 1; },
    },
    {
      id: 'orbit_dmg',
      title: 'Orbitals damage +4',
      desc: 'Augmente les dégâts des orbitaux.',
      apply: () => { upgrades.orbitDamage += 4; },
    },
    {
      id: 'orbit_speed',
      title: 'Orbitals speed +20%',
      desc: 'Orbitaux tournent plus vite.',
      apply: () => { upgrades.orbitSpeed *= 1.2; },
    },
    {
      id: 'orbit_radius',
      title: 'Orbitals radius +15',
      desc: 'Augmente le rayon des orbitaux.',
      apply: () => { upgrades.orbitRadius += 15; },
    },
    {
      id: 'dash_cd',
      title: 'Dash cooldown -15%',
      desc: 'Dash plus souvent.',
      apply: () => { upgrades.dashCooldownMs = max(450, floor(upgrades.dashCooldownMs * 0.85)); },
    },
    {
      id: 'whip_unlock',
      title: 'Whip: Unlock',
      desc: 'Débloque une attaque whip automatique.',
      apply: () => { upgrades.whipUnlocked = true; },
    },
    {
      id: 'whip_dmg',
      title: 'Whip damage +8',
      desc: 'Augmente les dégâts du whip.',
      apply: () => { upgrades.whipDamage += 8; },
    },
    {
      id: 'whip_cd',
      title: 'Whip cooldown -12%',
      desc: 'Whip plus souvent.',
      apply: () => { upgrades.whipCooldownMs = max(300, floor(upgrades.whipCooldownMs * 0.88)); },
    },
    {
      id: 'whip_range',
      title: 'Whip range +25',
      desc: 'Whip touche plus loin.',
      apply: () => { upgrades.whipRange += 25; },
    },
    {
      id: 'aura_unlock',
      title: 'Aura: Unlock',
      desc: 'Débloque une aura de dégâts autour de toi.',
      apply: () => { upgrades.auraUnlocked = true; },
    },
    {
      id: 'aura_dmg',
      title: 'Aura damage +2',
      desc: 'Augmente les dégâts de l’aura.',
      apply: () => { upgrades.auraDamage += 2; },
    },
    {
      id: 'aura_radius',
      title: 'Aura radius +18',
      desc: 'Augmente le rayon de l’aura.',
      apply: () => { upgrades.auraRadius += 18; },
    },
    {
      id: 'aura_tick',
      title: 'Aura tick +15%',
      desc: 'L’aura tick plus vite.',
      apply: () => { upgrades.auraTickMs = max(120, floor(upgrades.auraTickMs * 0.85)); },
    },
    {
      id: 'boom_unlock',
      title: 'Boomerang: Unlock',
      desc: 'Débloque un boomerang automatique.',
      apply: () => { upgrades.boomerangUnlocked = true; },
    },
    {
      id: 'boom_dmg',
      title: 'Boomerang damage +6',
      desc: 'Augmente les dégâts du boomerang.',
      apply: () => { upgrades.boomerangDamage += 6; },
    },
    {
      id: 'boom_cd',
      title: 'Boomerang cooldown -12%',
      desc: 'Boomerang plus souvent.',
      apply: () => { upgrades.boomerangCooldownMs = max(320, floor(upgrades.boomerangCooldownMs * 0.88)); },
    },
    {
      id: 'boom_pierce',
      title: 'Boomerang pierce +1',
      desc: 'Traverse plus d’ennemis.',
      apply: () => { upgrades.boomerangPierce += 1; },
    },
    {
      id: 'magnet',
      title: 'Magnet duration +2s',
      desc: 'Magnet dure plus longtemps.',
      apply: () => { upgrades.magnetDurationMs += 2000; },
    },
    {
      id: 'triple_unlock',
      title: 'Weapon: Triple Shot',
      desc: 'Tire 3 lasers en éventail.',
      apply: () => { upgrades.tripleShotUnlocked = true; },
    },
    {
      id: 'veh_1',
      title: 'Véhicule: Player 1',
      desc: 'Change ton vaisseau (skin).',
      apply: () => { setPlayerVehicle(1); },
    },
    {
      id: 'veh_2',
      title: 'Véhicule: Player 2',
      desc: 'Change ton vaisseau (skin).',
      apply: () => { setPlayerVehicle(2); },
    },
    {
      id: 'veh_3',
      title: 'Véhicule: Player 3',
      desc: 'Change ton vaisseau (skin).',
      apply: () => { setPlayerVehicle(3); },
    },
    {
      id: 'ion_unlock',
      title: 'Weapon: Ion Beam',
      desc: 'Déclenche un rayon qui perce.',
      apply: () => { upgrades.ionBeamUnlocked = true; },
    },
    {
      id: 'beam_cd',
      title: 'Ion Beam cooldown -15%',
      desc: 'Beam plus souvent.',
      apply: () => { upgrades.beamCooldownMs = max(260, floor(upgrades.beamCooldownMs * 0.85)); },
    },
    {
      id: 'beam_dur',
      title: 'Ion Beam duration +15%',
      desc: 'Beam dure plus longtemps.',
      apply: () => { upgrades.beamDurationMs = floor(upgrades.beamDurationMs * 1.15); },
    },
  ];

  let a = random(pool);
  pool = pool.filter(p => p.id !== a.id);
  let b = random(pool);
  pool = pool.filter(p => p.id !== b.id);
  let c = random(pool);

  return [a, b, c];
}

function keyPressed() {
  ensureAudio();
  resumeAudioIfNeeded();

  if (state === 'menu' || state === 'gameover') {
    if (keyCode === 49) { setPlayerVehicle(1); if (state === 'menu') showMenu(); else showGameOver(); }
    if (keyCode === 50) { setPlayerVehicle(2); if (state === 'menu') showMenu(); else showGameOver(); }
    if (keyCode === 51) { setPlayerVehicle(3); if (state === 'menu') showMenu(); else showGameOver(); }
  }

  if (key === 'z' || key === 'Z') keys.w = true;
  if (key === 'q' || key === 'Q') keys.a = true;
  if (key === 's' || key === 'S') keys.s = true;
  if (key === 'd' || key === 'D') keys.d = true;

  if (keyCode === SHIFT) {
    if (state === 'playing') {
      player.tryDash();
      playSfx('dash');
      addShake(1.4);
    }
  }

  if (keyCode === ENTER) {
    if (state === 'menu') {
      overlayDiv.hide();
      state = 'playing';
      startMs = millis();
    }
  }

  if (key === 'p' || key === 'P') {
    if (state === 'playing') {
      state = 'paused';
      overlayDiv.show();
      choicesDiv.hide();
      panelDiv.html('');
      panelDiv.child(createElement('h1', 'Pause'));
      panelDiv.child(createP('Appuie <span class="kbd">P</span> pour reprendre.'));
    } else if (state === 'paused') {
      overlayDiv.hide();
      state = 'playing';
    }
  }

  if (key === 'r' || key === 'R') {
    resetGame();
    overlayDiv.hide();
    state = 'playing';
    startMs = millis();
  }

  if (key === 'm' || key === 'M') {
    settings.sfx = !settings.sfx;
  }
  if (key === 'g' || key === 'G') {
    settings.particles = !settings.particles;
  }
  if (key === 'h' || key === 'H') {
    settings.hyperspace = !settings.hyperspace;
  }
  if (key === 'c' || key === 'C') {
    settings.casual = !settings.casual;
    if (state === 'menu') {
      showMenu();
    }
  }
  if (key === 'j' || key === 'J') {
    settings.postFx = !settings.postFx;
  }
  if (key === 'k' || key === 'K') {
    settings.heatShimmer = !settings.heatShimmer;
  }

  if (key === 'b' || key === 'B') {
    behaviorTuning.enemyAvoidActive = !behaviorTuning.enemyAvoidActive;
  }
  if (key === 'n' || key === 'N') {
    behaviorTuning.enemyFollowActive = !behaviorTuning.enemyFollowActive;
  }

  if (keyCode === UP_ARROW) {
    behaviorTuning.enemySeek = min(4.0, behaviorTuning.enemySeek + 0.1);
  }
  if (keyCode === DOWN_ARROW) {
    behaviorTuning.enemySeek = max(0.0, behaviorTuning.enemySeek - 0.1);
  }
  if (keyCode === RIGHT_ARROW) {
    behaviorTuning.enemyAvoid = min(6.0, behaviorTuning.enemyAvoid + 0.1);
  }
  if (keyCode === LEFT_ARROW) {
    behaviorTuning.enemyAvoid = max(0.0, behaviorTuning.enemyAvoid - 0.1);
  }

  if (state === 'levelup') {
    if (key === '1') selectUpgrade(0);
    if (key === '2') selectUpgrade(1);
    if (key === '3') selectUpgrade(2);
  }

  if (state === 'aidchoice') {
    if (key === '1' && currentAidChoices[0]) { applyAid(currentAidChoices[0].type); overlayDiv.hide(); state = 'playing'; }
    if (key === '2' && currentAidChoices[1]) { applyAid(currentAidChoices[1].type); overlayDiv.hide(); state = 'playing'; }
    if (key === '3' && currentAidChoices[2]) { applyAid(currentAidChoices[2].type); overlayDiv.hide(); state = 'playing'; }
  }

  if (state === 'shop') {
    if (key === '1' && currentShopChoices[0]) { buyShopChoice(currentShopChoices[0]); overlayDiv.hide(); state = 'playing'; }
    if (key === '2' && currentShopChoices[1]) { buyShopChoice(currentShopChoices[1]); overlayDiv.hide(); state = 'playing'; }
    if (key === '3' && currentShopChoices[2]) { buyShopChoice(currentShopChoices[2]); overlayDiv.hide(); state = 'playing'; }
  }
}

function keyReleased() {
  if (key === 'z' || key === 'Z') keys.w = false;
  if (key === 'q' || key === 'Q') keys.a = false;
  if (key === 's' || key === 'S') keys.s = false;
  if (key === 'd' || key === 'D') keys.d = false;
}

let currentUpgradeChoices = [];

function selectUpgrade(idx) {
  if (!currentUpgradeChoices[idx]) return;
  applyUpgrade(currentUpgradeChoices[idx]);
  overlayDiv.hide();
  state = 'playing';
}
