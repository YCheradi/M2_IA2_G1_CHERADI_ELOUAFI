class Projectile {
  constructor(x, y, dir, mode = 'blaster', damageMul = 1, pierceBonus = 0, spriteKey = null, speedMul = 1, sizeMul = 1) {
    this.pos = createVector(x, y);
    this.mode = mode;
    this.spriteKey = spriteKey;
    this.speedMul = speedMul;
    this.sizeMul = sizeMul;
    let sp = upgrades.projectileSpeed;
    if (this.mode === 'laser') sp *= 1.25;
    else if (this.mode === 'ion') sp *= 0.95;
    sp *= (this.speedMul ?? 1);
    this.vel = dir.copy().setMag(sp);
    this.acc = createVector(0, 0);
    this.maxSpeed = sp;
    this.maxForce = this.mode === 'laser' ? 1.35 : 1.2;
    this.desiredVel = this.vel.copy();
    this.r = this.mode === 'laser' ? 4 : 5;
    if (this.spriteKey) {
      let sm = (this.sizeMul ?? 1);
      this.r = max(this.r, 14 * sm);
    }
    let dmg = upgrades.damage;
    if (this.mode === 'laser') dmg = floor(dmg * 0.9) + 1;
    else if (this.mode === 'ion') dmg = floor(dmg * 1.25) + 1;
    this.damage = max(1, floor(dmg * (damageMul ?? 1)));
    let pierce = upgrades.projectilePierce;
    if (this.mode === 'laser') pierce += 1;
    this.pierceLeft = pierce + (pierceBonus ?? 0);
    this.hitIds = new Set();
    this.dead = false;
    this.trail = [this.pos.copy()];
    this.phase = random(1000);
  }

  applyForce(f) {
    this.acc.add(f);
  }

  update() {
    this.phase += 0.2;
    this.trail.unshift(this.pos.copy());
    let maxTrail = this.mode === 'laser' ? 12 : 10;
    if (this.trail.length > maxTrail) this.trail.pop();

    // steering: maintenir une trajectoire stable avec des forces
    let desired = this.desiredVel.copy();
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    this.applyForce(steer);

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    if (p5.Vector.dist(this.pos, player.pos) > 1200) this.dead = true;
  }

  draw(alpha = 255) {
    push();
    noFill();
    let a = min(alpha, 220);

    let spriteImg = null;
    if (this.mode === 'laser' && typeof laserSprite !== 'undefined' && laserSprite) {
      spriteImg = laserSprite;
    }

    if (spriteImg) {
      let dir = this.vel.copy();
      if (dir.mag() === 0) dir = createVector(0, -1);
      let heading = dir.heading() + HALF_PI;

      push();
      translate(this.pos.x, this.pos.y);
      rotate(heading);
      imageMode(CENTER);
      tint(255, min(255, a));

      let sc = (this.r * 5.8) / max(1, spriteImg.width);
      let w = spriteImg.width * sc;
      let h = spriteImg.height * sc;
      image(spriteImg, 0, 0, w, h);

      pop();

      pop();
      return;
    }

    let coreCol = [200, 255, 220];
    let col = [80, 255, 140];
    if (this.mode === 'laser') {
      coreCol = [240, 255, 255];
      col = [80, 210, 255];
    } else if (this.mode === 'ion') {
      coreCol = [240, 250, 255];
      col = [140, 200, 255];
    }

    for (let i = 0; i < this.trail.length - 1; i++) {
      let p0 = this.trail[i];
      let p1 = this.trail[i + 1];
      let t = i / (this.trail.length - 1);
      stroke(col[0], col[1], col[2], a * (1 - t) * 0.25);
      strokeWeight((this.mode === 'laser' ? 4.8 : 5.5) * (1 - t));
      line(p0.x, p0.y, p1.x, p1.y);
    }

    let dir = this.vel.copy();
    if (dir.mag() === 0) dir = createVector(0, -1);
    dir.normalize();
    let head = p5.Vector.add(this.pos, p5.Vector.mult(dir, 8));
    let tail = p5.Vector.add(this.pos, p5.Vector.mult(dir, -8));

    stroke(coreCol[0], coreCol[1], coreCol[2], a);
    strokeWeight(this.mode === 'laser' ? 2.8 : 3.2);
    line(tail.x, tail.y, head.x, head.y);
    stroke(col[0], col[1], col[2], a);
    strokeWeight(this.mode === 'laser' ? 1.2 : 1.4);
    line(tail.x, tail.y, head.x, head.y);
    pop();
  }
}

class EnemyProjectile {
  constructor(x, y, dir, speed, damage) {
    this.pos = createVector(x, y);
    this.vel = dir.copy().setMag(speed);
    this.acc = createVector(0, 0);
    this.maxSpeed = speed;
    this.maxForce = 1.2;
    this.desiredVel = this.vel.copy();
    this.r = 5;
    this.damage = damage;
    this.dead = false;
    this.spawnPos = this.pos.copy();
    this.trail = [this.pos.copy()];
    this.phase = random(1000);
  }

  applyForce(f) {
    this.acc.add(f);
  }

  update(slowFactor = 1) {
    this.phase += 0.2;
    this.trail.unshift(this.pos.copy());
    if (this.trail.length > 9) this.trail.pop();

    // steering: trajectoire stable via forces
    let desired = this.desiredVel.copy();
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    this.applyForce(steer);

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(p5.Vector.mult(this.vel, slowFactor));
    this.acc.mult(0);

    if (p5.Vector.dist(this.pos, this.spawnPos) > 1200) this.dead = true;
  }

  draw(alpha) {
    push();
    noFill();
    let a = min(alpha, 220);

    for (let i = 0; i < this.trail.length - 1; i++) {
      let p0 = this.trail[i];
      let p1 = this.trail[i + 1];
      let t = i / (this.trail.length - 1);
      stroke(255, 70, 70, a * (1 - t) * 0.26);
      strokeWeight(5.5 * (1 - t));
      line(p0.x, p0.y, p1.x, p1.y);
    }

    let dir = this.vel.copy();
    if (dir.mag() === 0) dir = createVector(0, -1);
    dir.normalize();
    let head = p5.Vector.add(this.pos, p5.Vector.mult(dir, 8));
    let tail = p5.Vector.add(this.pos, p5.Vector.mult(dir, -8));

    stroke(255, 200, 200, a);
    strokeWeight(3.2);
    line(tail.x, tail.y, head.x, head.y);
    stroke(255, 70, 70, a);
    strokeWeight(1.4);
    line(tail.x, tail.y, head.x, head.y);
    pop();
  }
}
