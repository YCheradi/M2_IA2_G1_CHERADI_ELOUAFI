let state = 'menu';

let player;
let enemies = [];
let projectiles = [];
let gems = [];
let orbitals = [];
let whipStrikes = [];
let boomerangs = [];
let pickups = [];

let cameraPos;

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
};

function setup() {
  createCanvas(windowWidth, windowHeight);
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
  showMenu();
}

class WhipStrike {
  constructor(x, y, dir) {
    this.pos = createVector(x, y);
    this.dir = dir;
    if (this.dir.mag() === 0) this.dir = createVector(0, -1);
    this.dir.normalize();
    this.range = upgrades.whipRange;
    this.width = upgrades.whipWidth;
    this.damage = upgrades.whipDamage;
    this.createdMs = millis();
    this.lifeMs = 120;
    this.dead = false;
    this.hitIds = new Set();
  }

  update() {
    if (millis() - this.createdMs > this.lifeMs) this.dead = true;
  }

  intersects(enemy) {
    let toE = p5.Vector.sub(enemy.pos, this.pos);
    let forward = this.dir.copy();
    let along = toE.dot(forward);
    if (along < 0 || along > this.range) return false;
    let closest = p5.Vector.add(this.pos, forward.mult(along));
    let d = p5.Vector.dist(closest, enemy.pos);
    return d < this.width / 2 + enemy.r;
  }

  draw(alpha) {
    push();
    stroke(255, 255, 255, alpha);
    strokeWeight(this.width);
    strokeCap(ROUND);
    let end = p5.Vector.add(this.pos, this.dir.copy().mult(this.range));
    line(this.pos.x, this.pos.y, end.x, end.y);
    pop();
  }
}

class Boomerang {
  constructor(x, y, dir) {
    this.pos = createVector(x, y);
    this.vel = dir.copy().mult(upgrades.boomerangSpeed);
    this.r = 9;
    this.damage = upgrades.boomerangDamage;
    this.pierceLeft = upgrades.boomerangPierce;
    this.hitIds = new Set();
    this.dead = false;
    this.createdMs = millis();
    this.outMs = 520;
  }

  update() {
    let age = millis() - this.createdMs;
    if (age > this.outMs) {
      let dir = p5.Vector.sub(player.pos, this.pos);
      if (dir.mag() > 0) {
        dir.setMag(upgrades.boomerangSpeed);
        this.vel = dir;
      }
    }
    this.pos.add(this.vel);
    if (age > 2200) this.dead = true;
    if (p5.Vector.dist(this.pos, player.pos) < player.r + this.r && age > 300) {
      this.dead = true;
    }
  }

  draw(alpha) {
    push();
    noStroke();
    fill(255, 180, 80, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}

class Pickup {
  constructor(x, y, type) {
    this.pos = createVector(x, y);
    this.type = type;
    this.r = 10;
    this.dead = false;
    this.phase = random(1000);
  }

  update() {
    this.phase += 0.07;
  }

  draw(alpha) {
    push();
    noStroke();
    let a = min(alpha, 150 + 80 * sin(this.phase));
    if (this.type === 'heal') fill(120, 255, 120, a);
    else if (this.type === 'magnet') fill(120, 180, 255, a);
    else fill(255, 120, 120, a);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function resetGame() {
  enemies = [];
  projectiles = [];
  gems = [];
  orbitals = [];
  whipStrikes = [];
  boomerangs = [];
  pickups = [];

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
  };

  player = new Player(width / 2, height / 2);
  cameraPos = player.pos.copy();

  startMs = millis();
  lastSpawnMs = millis();
  lastShotMs = millis();
  spawnRate = 900;
  nextBossAtMs = startMs + 60000;
  lastWhipMs = startMs;
  lastBoomerangMs = startMs;
  lastAuraTickMs = startMs;
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
  overlayDiv.show();
  choicesDiv.hide();
  panelDiv.html('');

  let h = createElement('h1', 'Survive (VS-like)');
  let p = createP('WASD pour bouger. Ton arme tire automatiquement. Ramasse les gemmes XP pour level-up.');
  let p2 = createP('Touches: <span class="kbd">Entrée</span> commencer | <span class="kbd">P</span> pause');
  let p3 = createP('En jeu: level-up => clique une carte ou appuie <span class="kbd">1</span>/<span class="kbd">2</span>/<span class="kbd">3</span>.');

  panelDiv.child(h);
  panelDiv.child(p);
  panelDiv.child(p2);
  panelDiv.child(p3);
}

function showGameOver() {
  state = 'gameover';
  overlayDiv.show();
  choicesDiv.hide();
  panelDiv.html('');

  let survived = ((millis() - startMs) / 1000).toFixed(1);
  let h = createElement('h1', 'Game Over');
  let p = createP('Temps: ' + survived + 's | Niveau: ' + player.level + ' | Score XP: ' + player.totalXp);
  let p2 = createP('Appuie <span class="kbd">R</span> pour recommencer.');

  panelDiv.child(h);
  panelDiv.child(p);
  panelDiv.child(p2);
}

function showLevelUp(choices) {
  state = 'levelup';
  overlayDiv.show();
  choicesDiv.show();
  panelDiv.html('');

  let h = createElement('h1', 'Level Up');
  let p = createP('Choisis une amélioration:');
  panelDiv.child(h);
  panelDiv.child(p);

  choicesDiv = createDiv('');
  choicesDiv.id('choices');
  panelDiv.child(choicesDiv);

  choices.forEach((c, idx) => {
    let card = createDiv('');
    card.class('choice');
    card.html('<b>[' + (idx + 1) + ']</b> ' + c.title + '<br><span style="opacity:0.9">' + c.desc + '</span>');
    card.mousePressed(() => {
      applyUpgrade(c);
      overlayDiv.hide();
      state = 'playing';
    });
    choicesDiv.child(card);
  });
}

function draw() {
  background(0, 0, 0, 255);

  if (state === 'menu' || state === 'gameover' || state === 'levelup' || state === 'paused') {
    drawWorld(true);
    drawHud();
    return;
  }

  let now = millis();

  player.update();
  cameraPos.x = lerp(cameraPos.x, player.pos.x, 0.18);
  cameraPos.y = lerp(cameraPos.y, player.pos.y, 0.18);

  syncOrbitals();
  for (let i = 0; i < orbitals.length; i++) {
    orbitals[i].update(i, orbitals.length);
  }

  let difficulty = min(3.0, 1.0 + (now - startMs) / 60000);
  spawnRate = max(200, 900 / difficulty);

  if (now - lastSpawnMs >= spawnRate && enemies.length < maxEnemies) {
    spawnEnemy(difficulty);
    lastSpawnMs = now;
  }

  if (now - lastShotMs >= upgrades.fireCooldownMs) {
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
          e.dead = true;
          dropGemsForEnemy(e);
        }
      }
    }
    lastAuraTickMs = now;
  }

  if (now >= nextBossAtMs) {
    spawnBoss();
    nextBossAtMs += 60000;
  }

  for (let e of enemies) e.update();
  for (let p of projectiles) p.update();
  for (let g of gems) g.update();
  for (let w of whipStrikes) w.update();
  for (let b of boomerangs) b.update();
  for (let pk of pickups) pk.update();

  handleCollisions();

  enemies = enemies.filter(e => !e.dead);
  projectiles = projectiles.filter(p => !p.dead);
  gems = gems.filter(g => !g.dead);
  whipStrikes = whipStrikes.filter(w => !w.dead);
  boomerangs = boomerangs.filter(b => !b.dead);
  pickups = pickups.filter(p => !p.dead);

  drawWorld(false);
  drawHud();

  if (player.hp <= 0) {
    showGameOver();
  }
}

function drawWorld(ghost) {
  let alpha = ghost ? 90 : 255;

  push();
  translate(width / 2 - cameraPos.x, height / 2 - cameraPos.y);

  // fond "monde" (grille)
  push();
  stroke(255, 255, 255, 18);
  strokeWeight(1);
  let grid = 120;
  let left = cameraPos.x - width / 2 - grid * 2;
  let right = cameraPos.x + width / 2 + grid * 2;
  let top = cameraPos.y - height / 2 - grid * 2;
  let bottom = cameraPos.y + height / 2 + grid * 2;
  for (let x = floor(left / grid) * grid; x <= right; x += grid) {
    line(x, top, x, bottom);
  }
  for (let y = floor(top / grid) * grid; y <= bottom; y += grid) {
    line(left, y, right, y);
  }
  pop();

  for (let g of gems) g.draw(alpha);
  for (let pk of pickups) pk.draw(alpha);
  for (let o of orbitals) o.draw(alpha);
  for (let w of whipStrikes) w.draw(alpha);
  for (let b of boomerangs) b.draw(alpha);
  for (let p of projectiles) p.draw(alpha);
  for (let e of enemies) e.draw(alpha);
  player.draw(alpha);

  pop();
}

function drawHud() {
  let survived = ((millis() - startMs) / 1000).toFixed(1);
  let bossIn = max(0, Math.ceil((nextBossAtMs - millis()) / 1000));

  let dashReadyIn = 0;
  if (player) {
    dashReadyIn = max(0, Math.ceil((player.nextDashAtMs - millis()) / 1000));
  }

  let hpPct = max(0, min(1, player.hp / upgrades.maxHp));
  let xpPct = max(0, min(1, player.xp / player.xpToNext));

  let html = '';
  html += '<div><b>Niveau</b>: ' + player.level + ' &nbsp; <b>Temps</b>: ' + survived + 's</div>';
  html += '<div style="margin-top:8px"><b>HP</b>: ' + Math.ceil(player.hp) + ' / ' + upgrades.maxHp + '</div>';
  html += '<div class="bar hp"><div style="width:' + Math.floor(hpPct * 100) + '%"></div></div>';
  html += '<div><b>XP</b>: ' + player.xp + ' / ' + player.xpToNext + '</div>';
  html += '<div class="bar xp"><div style="width:' + Math.floor(xpPct * 100) + '%"></div></div>';
  html += '<div style="opacity:0.9">Ennemis: ' + enemies.length + ' &nbsp; Projectiles: ' + projectiles.length + '</div>';
  let magnetOn = player && player.magnetUntilMs > millis();
  html += '<div style="opacity:0.9">Dash: ' + (dashReadyIn === 0 ? 'READY' : dashReadyIn + 's') + ' &nbsp; Boss: ' + bossIn + 's</div>';
  html += '<div style="opacity:0.9">Whip: ' + (upgrades.whipUnlocked ? 'ON' : 'OFF') + ' | Aura: ' + (upgrades.auraUnlocked ? 'ON' : 'OFF') + ' | Boomerang: ' + (upgrades.boomerangUnlocked ? 'ON' : 'OFF') + ' | Magnet: ' + (magnetOn ? 'ON' : 'OFF') + '</div>';
  html += '<div style="opacity:0.9">Touches: <span class="kbd">P</span> pause, <span class="kbd">R</span> reset</div>';

  hudDiv.html(html);
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
  e.maxSpeed = 1.8 + random(0.4, 1.0) * difficulty;
  e.hp = 16 + floor(random(0, 8)) + floor(8 * (difficulty - 1));
  e.touchDamage = 8 + floor(4 * (difficulty - 1));

  if (random() < min(0.22, 0.06 + (difficulty - 1) * 0.08)) {
    e.isElite = true;
    e.r = 18;
    e.maxSpeed *= 1.25;
    e.hp = floor(e.hp * 2.2);
    e.touchDamage = floor(e.touchDamage * 1.6);
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
  b.r = 32;
  b.maxSpeed = 1.6;
  b.maxForce = 0.18;
  b.hp = 520 + floor((millis() - startMs) / 1000) * 2;
  b.touchDamage = 22;
  b.isElite = true;
  enemies.push(b);
}

function autoShoot() {
  let target = findNearestEnemy(player.pos, 800);
  if (!target) return;

  let dir = p5.Vector.sub(target.pos, player.pos);
  if (dir.mag() === 0) return;
  dir.normalize();

  let p = new Projectile(player.pos.x, player.pos.y, dir);
  projectiles.push(p);
}

function handleCollisions() {
  for (let e of enemies) {
    if (e.dead) continue;

    let d = p5.Vector.dist(e.pos, player.pos);
    if (d < e.r + player.r) {
      if (player.invulnerableUntilMs > millis()) {
        continue;
      }
      player.takeDamage(e.touchDamage);
      let pushDir = p5.Vector.sub(player.pos, e.pos);
      if (pushDir.mag() > 0) {
        pushDir.setMag(6);
        player.pos.add(pushDir);
      }
    }
  }

  // Orbitals collision (dégâts en continu)
  for (let o of orbitals) {
    for (let e of enemies) {
      if (e.dead) continue;
      let d = p5.Vector.dist(o.pos, e.pos);
      if (d < o.r + e.r) {
        e.hp -= o.damage;
        if (e.hp <= 0) {
          e.dead = true;
          dropGemsForEnemy(e);
        }
      }
    }
  }

  for (let p of projectiles) {
    if (p.dead) continue;

    for (let e of enemies) {
      if (e.dead) continue;
      let d = p5.Vector.dist(p.pos, e.pos);
      if (d < p.r + e.r) {
        if (p.hitIds.has(e.id)) continue;
        p.hitIds.add(e.id);

        e.hp -= p.damage;
        p.pierceLeft -= 1;

        let knock = p5.Vector.sub(e.pos, p.pos);
        if (knock.mag() > 0) {
          knock.setMag(3);
          e.pos.add(knock);
        }

        if (e.hp <= 0) {
          e.dead = true;
          dropGemsForEnemy(e);
        }

        if (p.pierceLeft <= 0) {
          p.dead = true;
          break;
        }
      }
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
    }
  }
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

  if (random() < (enemy.isElite ? 0.12 : 0.05)) {
    let r = random();
    let type = 'heal';
    if (r < 0.34) type = 'heal';
    else if (r < 0.72) type = 'magnet';
    else type = 'bomb';
    pickups.push(new Pickup(enemy.pos.x + random(-8, 8), enemy.pos.y + random(-8, 8), type));
  }
}

function applyPickup(type) {
  if (type === 'heal') {
    player.hp = min(upgrades.maxHp, player.hp + 28);
  } else if (type === 'magnet') {
    player.magnetUntilMs = millis() + upgrades.magnetDurationMs;
  } else if (type === 'bomb') {
    for (let e of enemies) {
      if (e.dead) continue;
      let d = p5.Vector.dist(e.pos, player.pos);
      if (d < 260) {
        e.hp -= 140;
        if (e.hp <= 0) {
          e.dead = true;
          dropGemsForEnemy(e);
        }
      }
    }
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
  ];

  let a = random(pool);
  pool = pool.filter(p => p.id !== a.id);
  let b = random(pool);
  pool = pool.filter(p => p.id !== b.id);
  let c = random(pool);

  return [a, b, c];
}

function keyPressed() {
  if (key === 'w' || key === 'W') keys.w = true;
  if (key === 'a' || key === 'A') keys.a = true;
  if (key === 's' || key === 'S') keys.s = true;
  if (key === 'd' || key === 'D') keys.d = true;

  if (keyCode === SHIFT) {
    if (state === 'playing') {
      player.tryDash();
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

  if (state === 'levelup') {
    if (key === '1') selectUpgrade(0);
    if (key === '2') selectUpgrade(1);
    if (key === '3') selectUpgrade(2);
  }
}

function keyReleased() {
  if (key === 'w' || key === 'W') keys.w = false;
  if (key === 'a' || key === 'A') keys.a = false;
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

class Player {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.r = 14;
    this.hp = upgrades.maxHp;
    this.xp = 0;
    this.totalXp = 0;
    this.level = 1;
    this.xpToNext = 10;
    this.lastRegenMs = millis();
    this.invulnerableUntilMs = 0;
    this.dashingUntilMs = 0;
    this.nextDashAtMs = millis();
    this.lastMoveDir = createVector(0, -1);
    this.magnetUntilMs = 0;
  }

  update() {
    let dir = createVector(0, 0);
    if (keys.w) dir.y -= 1;
    if (keys.s) dir.y += 1;
    if (keys.a) dir.x -= 1;
    if (keys.d) dir.x += 1;

    let now = millis();

    if (dir.mag() > 0) {
      this.lastMoveDir = dir.copy().normalize();
    }

    if (now < this.dashingUntilMs) {
      let dashDir = this.lastMoveDir.copy();
      dashDir.setMag(upgrades.dashSpeed);
      this.pos.add(dashDir);
    } else {
      if (dir.mag() > 0) {
        dir.normalize();
        dir.mult(upgrades.moveSpeed);
      }

      this.pos.add(dir);
    }

    if (upgrades.regenPerSec > 0) {
      let dt = (now - this.lastRegenMs) / 1000;
      this.lastRegenMs = now;
      this.hp = min(upgrades.maxHp, this.hp + upgrades.regenPerSec * dt);
    }
  }

  tryDash() {
    let now = millis();
    if (now < this.nextDashAtMs) return;
    this.dashingUntilMs = now + upgrades.dashDurationMs;
    this.invulnerableUntilMs = now + upgrades.dashDurationMs + 120;
    this.nextDashAtMs = now + upgrades.dashCooldownMs;
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  gainXp(v) {
    this.totalXp += v;
    this.xp += v;
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.xpToNext = floor(this.xpToNext * 1.35) + 4;
      currentUpgradeChoices = buildUpgradeChoices();
      showLevelUp(currentUpgradeChoices);
    }
  }

  draw(alpha) {
    push();
    noStroke();
    let invul = this.invulnerableUntilMs > millis();
    if (invul) {
      fill(255, 255, 255, min(alpha, 120));
    } else {
      fill(255, 255, 255, alpha);
    }
    circle(this.pos.x, this.pos.y, this.r * 2);

    fill(80, 180, 255, alpha * 0.75);
    circle(this.pos.x, this.pos.y, this.r * 1.2);

    pop();
  }
}

let enemyIdCounter = 1;

class Enemy {
  constructor(x, y) {
    this.id = enemyIdCounter++;
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.r = 13;
    this.maxSpeed = 2.3;
    this.maxForce = 0.22;
    this.hp = 20;
    this.touchDamage = 10;
    this.dead = false;
    this.isBoss = false;
    this.isElite = false;
  }

  update() {
    let force = this.seek(player.pos);
    this.vel.add(force);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.pos);
    let d = desired.mag();
    if (d === 0) return createVector(0, 0);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  draw(alpha) {
    push();
    noStroke();
    if (this.isBoss) fill(255, 140, 60, alpha);
    else if (this.isElite) fill(120, 255, 160, alpha);
    else fill(200, 100, 255, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);

    if (this.isBoss) {
      let hpPct = max(0, min(1, this.hp / 800));
      stroke(0, 0, 0, alpha);
      strokeWeight(2);
      fill(255, 60, 60, alpha);
      rectMode(CENTER);
      rect(this.pos.x, this.pos.y - this.r - 16, 64 * hpPct, 8, 4);
      rectMode(CORNER);
    }
    pop();
  }
}

class Orbital {
  constructor() {
    this.pos = createVector(0, 0);
    this.phase = random(TWO_PI);
    this.r = 10;
  }

  update(index, total) {
    this.damage = upgrades.orbitDamage;
    let base = total > 0 ? (TWO_PI * index) / total : 0;
    this.phase += upgrades.orbitSpeed;
    let ang = base + this.phase;
    let rr = upgrades.orbitRadius;
    this.pos.x = player.pos.x + cos(ang) * rr;
    this.pos.y = player.pos.y + sin(ang) * rr;
  }

  draw(alpha) {
    push();
    noStroke();
    fill(120, 255, 200, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}

class Projectile {
  constructor(x, y, dir) {
    this.pos = createVector(x, y);
    this.vel = dir.copy().mult(upgrades.projectileSpeed);
    this.r = 5;
    this.damage = upgrades.damage;
    this.pierceLeft = upgrades.projectilePierce;
    this.hitIds = new Set();
    this.dead = false;
  }

  update() {
    this.pos.add(this.vel);
    if (p5.Vector.dist(this.pos, player.pos) > 1200) this.dead = true;
  }

  draw(alpha) {
    push();
    noStroke();
    fill(255, 230, 120, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }
}

class Gem {
  constructor(x, y, value) {
    this.pos = createVector(x, y);
    this.value = value;
    this.r = 7;
    this.dead = false;
    this.phase = random(1000);
  }

  update() {
    this.phase += 0.06;
  }

  draw(alpha) {
    push();
    noStroke();
    let glow = 70 + 50 * sin(this.phase);
    if (this.value >= 4) fill(80, 255, 160, alpha);
    else if (this.value >= 2) fill(80, 180, 255, alpha);
    else fill(180, 180, 255, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);

    fill(255, 255, 255, min(alpha, glow));
    circle(this.pos.x, this.pos.y, this.r);
    pop();
  }
}
