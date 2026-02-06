class Vehicule {
  static debug = false;

  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    this.maxSpeed = 4;
    this.maxForce = 0.2;

    this.r = 16;

    this.wanderTheta = -Math.PI / 2;
    this.wanderDistance = 150;
    this.wanderRadius = 50;
    this.wanderDisplace = 0.3;
  }

  applyForce(force) {
    if (!force) return;
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  show() {
    push();
    stroke(255);
    strokeWeight(2);
    fill(255);
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.0001) rotate(this.vel.heading());
    triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    pop();
  }

  seek(target, arrival = false, slowRadius = 100) {
    if (!target) return createVector(0, 0);

    let desired = p5.Vector.sub(target, this.pos);
    let d = desired.mag();
    if (d === 0) return createVector(0, 0);

    let desiredSpeed = this.maxSpeed;
    if (arrival && d < slowRadius) {
      desiredSpeed = map(d, 0, slowRadius, 0, this.maxSpeed);
    }

    desired.setMag(desiredSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  arrive(target, slowRadius = 100) {
    return this.seek(target, true, slowRadius);
  }

  flee(target) {
    return this.seek(target).mult(-1);
  }

  avoid(obstacles) {
    let lookAhead = (typeof this.lookAhead === 'number' && isFinite(this.lookAhead))
      ? this.lookAhead
      : 80;
    return this.avoidObstacles(obstacles, lookAhead);
  }

  separate(vehicles, desiredSeparation = 40) {
    if (!vehicles || vehicles.length === 0) return createVector(0, 0);

    let steer = createVector(0, 0);
    let count = 0;

    for (let other of vehicles) {
      if (!other || other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count += 1;
      }
    }

    if (count === 0) return createVector(0, 0);

    steer.div(count);
    steer.setMag(this.maxSpeed);
    steer.sub(this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  align(vehicles, neighborDist = 60) {
    if (!vehicles || vehicles.length === 0) return createVector(0, 0);

    let sum = createVector(0, 0);
    let count = 0;

    for (let other of vehicles) {
      if (!other || other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < neighborDist) {
        sum.add(other.vel);
        count += 1;
      }
    }

    if (count === 0) return createVector(0, 0);

    sum.div(count);
    sum.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(sum, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  cohesion(vehicles, neighborDist = 60) {
    if (!vehicles || vehicles.length === 0) return createVector(0, 0);

    let sum = createVector(0, 0);
    let count = 0;

    for (let other of vehicles) {
      if (!other || other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < neighborDist) {
        sum.add(other.pos);
        count += 1;
      }
    }

    if (count === 0) return createVector(0, 0);

    sum.div(count);
    return this.seek(sum);
  }

  wander() {
    let v = this.vel.copy();
    if (v.mag() < 0.001) v = createVector(1, 0);
    v.setMag(this.wanderDistance);

    let circleCenter = p5.Vector.add(this.pos, v);

    let theta = this.wanderTheta + this.vel.heading();
    let displacement = createVector(
      this.wanderRadius * cos(theta),
      this.wanderRadius * sin(theta)
    );

    let target = p5.Vector.add(circleCenter, displacement);

    this.wanderTheta += random(-this.wanderDisplace, this.wanderDisplace);

    let desired = p5.Vector.sub(target, this.pos);
    if (desired.mag() === 0) return createVector(0, 0);
    desired.setMag(this.maxSpeed);

    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  avoidObstacles(obstacles, lookAhead = 80) {
    if (!obstacles || obstacles.length === 0) return createVector(0, 0);
    if (this.vel.mag() === 0) return createVector(0, 0);

    let ahead = this.vel.copy();
    ahead.setMag(lookAhead);
    let aheadPos = p5.Vector.add(this.pos, ahead);

    let threat = null;
    let minD = Infinity;

    for (let obs of obstacles) {
      if (!obs) continue;
      let d = p5.Vector.dist(aheadPos, obs.pos);
      if (d < obs.r + this.r) {
        if (d < minD) {
          minD = d;
          threat = obs;
        }
      }
    }

    if (!threat) return createVector(0, 0);

    let desired = p5.Vector.sub(aheadPos, threat.pos);
    if (desired.mag() === 0) desired = p5.Vector.random2D();
    desired.setMag(this.maxSpeed);

    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce * 2);
    return steer;
  }

  follow(path) {
    return this.followPath(path, 35);
  }

  followPath(path, predictDist = 35) {
    if (!path || !path.points || path.points.length < 2) return createVector(0, 0);
    if (this.vel.mag() === 0) return createVector(0, 0);

    let future = this.vel.copy();
    future.setMag(predictDist);
    future.add(this.pos);

    let closestTarget = null;
    let worldRecord = Infinity;

    for (let i = 0; i < path.points.length - 1; i++) {
      let a = path.points[i];
      let b = path.points[i + 1];

      let normal = findProjection(a, future, b);
      let d = p5.Vector.dist(future, normal);

      if (d < worldRecord) {
        worldRecord = d;
        let dir = p5.Vector.sub(b, a);
        if (dir.mag() === 0) continue;
        dir.normalize();
        dir.mult(25);
        closestTarget = p5.Vector.add(normal, dir);
      }
    }

    if (closestTarget && worldRecord > path.radius) {
      return this.seek(closestTarget);
    }

    return createVector(0, 0);
  }
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
    this.shieldHits = 0;
    this.phase = random(1000);

    this.shipType = 'fighter';
    this.weaponMode = 'blaster';
    this.baseWeaponMode = 'blaster';
    this.weaponModeUntilMs = 0;
    this.tempTripleUntilMs = 0;

    this.shipBuffType = '';
    this.shipBuffUntilMs = 0;
  }

  update() {
    let dir = createVector(0, 0);
    if (keys.w) dir.y -= 1;
    if (keys.s) dir.y += 1;
    if (keys.a) dir.x -= 1;
    if (keys.d) dir.x += 1;

    let now = millis();

    if (now >= this.weaponModeUntilMs) {
      this.weaponMode = this.baseWeaponMode;
    }

    if (now >= this.shipBuffUntilMs) {
      this.shipBuffType = '';
    }

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
        let sp = upgrades.moveSpeed;
        if (now < this.shipBuffUntilMs) {
          if (this.shipBuffType === 'interceptor') sp *= 1.22;
          else if (this.shipBuffType === 'bomber') sp *= 0.92;
        }
        if (typeof overdriveUntilMs !== 'undefined' && now < overdriveUntilMs) {
          sp *= 1.25;
        }
        dir.mult(sp);
      }
      this.pos.add(dir);
    }

    if (upgrades.regenPerSec > 0) {
      let dt = (now - this.lastRegenMs) / 1000;
      this.lastRegenMs = now;
      this.hp = min(upgrades.maxHp, this.hp + upgrades.regenPerSec * dt);
    }
  }

  resolveObstacleCollisions(obstacles) {
    if (!obstacles || obstacles.length === 0) return;
    for (let obs of obstacles) {
      let delta = p5.Vector.sub(this.pos, obs.pos);
      let dist = delta.mag();
      let minDist = this.r + obs.r;
      if (dist === 0) {
        delta = p5.Vector.random2D();
        dist = 0.0001;
      }
      if (dist < minDist) {
        delta.setMag(minDist - dist + 0.1);
        this.pos.add(delta);
      }
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
    if (this.shieldHits > 0) {
      this.shieldHits -= 1;
      this.invulnerableUntilMs = max(this.invulnerableUntilMs, millis() + 220);
      return;
    }
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
    let now = millis();
    let invul = this.invulnerableUntilMs > now;
    let dashing = this.dashingUntilMs > now;
    this.phase += 0.08;

    noStroke();
    let halo = [80, 180, 255];
    if (this.shipType === 'interceptor') halo = [140, 220, 255];
    else if (this.shipType === 'bomber') halo = [255, 200, 140];
    fill(halo[0], halo[1], halo[2], min(alpha, 55));
    circle(this.pos.x, this.pos.y, this.r * 3.2);

    if (this.shieldHits > 0) {
      noFill();
      stroke(255, 240, 140, min(alpha, 200));
      strokeWeight(3);
      circle(this.pos.x, this.pos.y, this.r * 2.7);
    }

    let dir = this.lastMoveDir.copy();
    if (dir.mag() === 0) dir = createVector(0, -1);
    let heading = dir.heading() + HALF_PI;
    let tilt = 0;
    if (keys.a) tilt -= 0.16;
    if (keys.d) tilt += 0.16;
    if (dashing) tilt *= 1.6;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(heading + tilt);

    let thrust = (keys.w || keys.a || keys.s || keys.d) ? 1 : 0;
    let flame = (0.55 + 0.45 * sin(this.phase * 1.7)) * (thrust ? 1 : 0.2);
    let flameLen = this.r * (0.9 + 0.9 * flame);

    noStroke();
    blendMode(ADD);
    fill(140, 200, 255, min(alpha, 22));
    ellipse(0, this.r * 0.55 + flameLen * 0.35, this.r * 1.2, this.r * 1.6);
    fill(180, 220, 255, min(alpha, 16));
    ellipse(0, this.r * 0.55 + flameLen * 0.55, this.r * 0.9, this.r * 1.2);
    blendMode(BLEND);
    fill(140, 200, 255, min(alpha, 70));
    triangle(-this.r * 0.55, this.r * 0.55, this.r * 0.55, this.r * 0.55, 0, this.r * 0.55 + flameLen);
    fill(255, 220, 120, min(alpha, 140));
    triangle(-this.r * 0.33, this.r * 0.55, this.r * 0.33, this.r * 0.55, 0, this.r * 0.55 + flameLen * 0.7);

    let sc = 1.0;
    if (this.shipType === 'interceptor') sc = 0.95;
    else if (this.shipType === 'bomber') sc = 1.12;

    let L = this.r * 2.35 * sc;
    let W = this.r * 0.70 * sc;
    let wingSpan = this.r * 2.6 * sc;
    let wingBack = this.r * 0.15 * sc;
    let wingFront = this.r * 1.35 * sc;
    let wingSep = this.r * 0.42 * sc;

    noStroke();
    fill(0, 0, 0, min(alpha, 28));
    beginShape();
    vertex(-W * 0.55, -L * 0.65 + 2);
    vertex(0, -L * 1.05 + 2);
    vertex(W * 0.55, -L * 0.65 + 2);
    vertex(W * 0.38, L * 0.95 + 2);
    vertex(-W * 0.38, L * 0.95 + 2);
    endShape(CLOSE);

    if (dashing) fill(255, 255, 255, min(alpha, 235));
    else if (invul) fill(242, 248, 255, min(alpha, 200));
    else fill(236, 244, 255, alpha);

    stroke(120, 170, 215, min(alpha, 95));
    strokeWeight(1.4);
    beginShape();
    vertex(0, -L * 1.10);
    vertex(-W * 0.60, -L * 0.62);
    vertex(-W * 0.40, L * 0.95);
    vertex(W * 0.40, L * 0.95);
    vertex(W * 0.60, -L * 0.62);
    endShape(CLOSE);

    noStroke();
    fill(200, 220, 240, min(alpha, 210));
    rectMode(CENTER);
    rect(0, -L * 0.15, W * 0.35, L * 1.55, this.r * 0.22);

    fill(60, 150, 255, min(alpha, 190));
    ellipse(0, -L * 0.45, W * 0.55, L * 0.55);
    fill(200, 240, 255, min(alpha, 110));
    ellipse(0, -L * 0.52, W * 0.30, L * 0.30);

    stroke(90, 120, 150, min(alpha, 120));
    strokeWeight(1.2);
    fill(170, 195, 215, min(alpha, 175));
    beginShape();
    vertex(-wingSep, -wingBack);
    vertex(-wingSpan, -wingFront);
    vertex(-wingSpan * 0.78, -wingFront * 0.92);
    vertex(-wingSep * 0.95, -wingBack * 0.10);
    endShape(CLOSE);
    beginShape();
    vertex(wingSep, -wingBack);
    vertex(wingSpan, -wingFront);
    vertex(wingSpan * 0.78, -wingFront * 0.92);
    vertex(wingSep * 0.95, -wingBack * 0.10);
    endShape(CLOSE);
    beginShape();
    vertex(-wingSep, wingBack);
    vertex(-wingSpan, wingFront);
    vertex(-wingSpan * 0.78, wingFront * 0.92);
    vertex(-wingSep * 0.95, wingBack * 0.10);
    endShape(CLOSE);
    beginShape();
    vertex(wingSep, wingBack);
    vertex(wingSpan, wingFront);
    vertex(wingSpan * 0.78, wingFront * 0.92);
    vertex(wingSep * 0.95, wingBack * 0.10);
    endShape(CLOSE);

    stroke(235, 90, 90, min(alpha, 170));
    strokeWeight(2.0);
    line(-wingSpan * 0.55, -wingFront * 0.55, -wingSep * 1.02, -wingBack * 0.25);
    line(wingSpan * 0.55, -wingFront * 0.55, wingSep * 1.02, -wingBack * 0.25);
    line(-wingSpan * 0.55, wingFront * 0.55, -wingSep * 1.02, wingBack * 0.25);
    line(wingSpan * 0.55, wingFront * 0.55, wingSep * 1.02, wingBack * 0.25);

    stroke(210, 220, 230, min(alpha, 220));
    strokeWeight(3);
    line(-wingSpan * 0.98, -wingFront * 1.02, -wingSpan * 1.08, -wingFront * 1.22);
    line(wingSpan * 0.98, -wingFront * 1.02, wingSpan * 1.08, -wingFront * 1.22);
    line(-wingSpan * 0.98, wingFront * 1.02, -wingSpan * 1.08, wingFront * 1.22);
    line(wingSpan * 0.98, wingFront * 1.02, wingSpan * 1.08, wingFront * 1.22);

    noStroke();
    fill(60, 70, 85, min(alpha, 200));
    ellipse(-W * 0.55, L * 0.78, W * 0.55, W * 0.55);
    ellipse(W * 0.55, L * 0.78, W * 0.55, W * 0.55);
    blendMode(ADD);
    fill(120, 200, 255, min(alpha, 60));
    ellipse(-W * 0.55, L * 0.82, W * 0.75, W * 0.75);
    ellipse(W * 0.55, L * 0.82, W * 0.75, W * 0.75);
    blendMode(BLEND);

    pop();
    pop();
  }
}

let enemyIdCounter = 1;

class Enemy extends Vehicule {
  constructor(x, y) {
    super(x, y);
    this.id = enemyIdCounter++;
    this.r = 13;
    this.maxSpeed = 2.3;
    this.maxForce = 0.22;
    this.hp = 20;
    this.touchDamage = 10;
    this.dead = false;
    this.isBoss = false;
    this.isElite = false;
    this.isRanged = false;
    this.variant = 'ship';

    this.seekWeight = 1.0;
    this.avoidWeight = 1.8;
    this.pathWeight = 0.0;

    this.lookAhead = 90;

    this.behaviorManager = new BehaviorManager();
    this.behaviorManager.add({
      name: 'seekPlayer',
      fn: (v, ctx) => {
        if (!ctx || !ctx.targetPos) return createVector(0, 0);
        let toPlayer = p5.Vector.sub(ctx.targetPos, v.pos);
        let distToPlayer = toPlayer.mag();
        if (v.isRanged && distToPlayer > 0) {
          if (distToPlayer < 220) {
            toPlayer.mult(-1);
            toPlayer.setMag(v.maxSpeed);
            let steer = p5.Vector.sub(toPlayer, v.vel);
            steer.limit(v.maxForce);
            return steer;
          }
          if (distToPlayer > 320) {
            return v.seek(ctx.targetPos);
          }
          return createVector(0, 0);
        }
        return v.seek(ctx.targetPos);
      },
    }, this.seekWeight);

    this.behaviorManager.add({
      name: 'avoidObstacles',
      fn: (v, ctx) => {
        if (!ctx || !ctx.obstacles || ctx.obstacles.length === 0) return createVector(0, 0);
        return v.avoid(ctx.obstacles);
      },
    }, this.avoidWeight);

    this.behaviorManager.add({
      name: 'followPath',
      fn: (v, ctx) => {
        if (!ctx || !ctx.path) return createVector(0, 0);
        return v.follow(ctx.path);
      },
    }, this.pathWeight);

    this.maxHp = this.hp;
    this.shotCooldownMs = 1200;
    this.lastShotMs = 0;
    this.shotRange = 520;

    this.phase = random(1000);
    this.hitUntilMs = 0;

    this.nextChargeAtMs = millis() + 2400 + random(1200);
    this.chargingUntilMs = 0;
    this.nextBossBurstAtMs = millis() + 1100 + random(800);
  }

  update(obstacles, path, enemyProjectiles, slowFactor = 1) {
    let now = millis();

    if (this.behaviorManager) {
      let bSeek = this.behaviorManager.getBehavior('seekPlayer');
      if (bSeek) bSeek.weight = this.seekWeight;
      let bAvoid = this.behaviorManager.getBehavior('avoidObstacles');
      if (bAvoid) bAvoid.weight = this.avoidWeight;
      let bFollow = this.behaviorManager.getBehavior('followPath');
      if (bFollow) bFollow.weight = this.pathWeight;
    }

    let force = this.behaviorManager
      ? this.behaviorManager.getSteeringForce(this, { targetPos: player.pos, obstacles, path })
      : createVector(0, 0);

    force.limit(this.maxForce * 4);

    if (this.isBoss && now < this.chargingUntilMs) {
      let prevMaxSpeed = this.maxSpeed;
      let boostedSpeed = this.maxSpeed * 3.2;
      let boostedForce = this.maxForce * 6;

      let desired = p5.Vector.sub(player.pos, this.pos);
      if (desired.mag() > 0) {
        desired.setMag(boostedSpeed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(boostedForce);
        this.applyForce(steer);
      }

      this.maxSpeed = boostedSpeed;
      super.update();
      this.maxSpeed = prevMaxSpeed;
    } else {
      this.applyForce(force);
      super.update();
    }

    if (slowFactor !== 1) {
      this.pos.add(p5.Vector.mult(this.vel, slowFactor - 1));
    }

    if (obstacles && obstacles.length) {
      for (let obs of obstacles) {
        this.resolveObstacleCollision(obs);
      }
    }

    if (enemyProjectiles) {
      this.tryShoot(enemyProjectiles);
    }

    if (this.isBoss && now > this.nextChargeAtMs) {
      this.chargingUntilMs = now + 260;
      this.nextChargeAtMs = now + 2600 + random(1400);
    }
  }

  tryShoot(enemyProjectiles) {
    let now = millis();
    let d = p5.Vector.dist(this.pos, player.pos);
    if (d > this.shotRange) return;

    let dir = p5.Vector.sub(player.pos, this.pos);
    if (dir.mag() === 0) return;
    dir.normalize();

    if (this.isBoss) {
      let hpPct = this.maxHp > 0 ? this.hp / this.maxHp : 1;
      let phase2 = hpPct < 0.5;
      if (now < this.nextBossBurstAtMs) return;

      let n = phase2 ? 14 : 10;
      let base = dir.heading();
      let spread = phase2 ? 1.25 : 0.95;
      for (let i = 0; i < n; i++) {
        let a = base - spread * 0.5 + (spread * i) / (n - 1);
        let dd = p5.Vector.fromAngle(a);
        enemyProjectiles.push(new EnemyProjectile(this.pos.x, this.pos.y, dd, phase2 ? 8.3 : 7.6, phase2 ? 12 : 10));
      }
      if (typeof playSfx === 'function') playSfx('shoot');
      this.nextBossBurstAtMs = now + (phase2 ? 820 : 1050);
      this.lastShotMs = now;
      return;
    }

    if (!this.isRanged) return;
    if (now - this.lastShotMs < this.shotCooldownMs) return;
    enemyProjectiles.push(new EnemyProjectile(this.pos.x, this.pos.y, dir, 7.5, 10));
    this.lastShotMs = now;
  }

  resolveObstacleCollision(obstacle) {
    let delta = p5.Vector.sub(this.pos, obstacle.pos);
    let dist = delta.mag();
    let minDist = this.r + obstacle.r;
    if (dist === 0) {
      delta = p5.Vector.random2D();
      dist = 0.0001;
    }
    if (dist < minDist) {
      delta.setMag(minDist - dist + 0.1);
      this.pos.add(delta);
      this.vel.mult(0.85);
    }
  }

  show(alpha) {
    return this.draw(alpha);
  }

  draw(alpha) {
    push();
    let now = millis();
    this.phase += 0.06;

    let col;
    if (this.isBoss) col = [255, 160, 80];
    else if (this.isElite) col = [200, 230, 255];
    else if (this.isRanged) col = [255, 110, 110];
    else col = [185, 195, 210];

    if (now < this.hitUntilMs) {
      col = [255, 245, 190];
    }

    noStroke();
    fill(col[0], col[1], col[2], min(alpha, 55));
    circle(this.pos.x, this.pos.y, this.r * 3.0);

    let v = this.vel.copy();
    let heading = (v.mag() > 0.15 ? v.heading() : p5.Vector.sub(player.pos, this.pos).heading()) + HALF_PI;
    let wobble = 0.12 * sin(this.phase * 1.25);

    push();
    translate(this.pos.x, this.pos.y);
    rotate(heading + wobble);

    if (this.variant === 'ufo') {
      stroke(180, 220, 255, min(alpha, 70));
      strokeWeight(1.6);
      fill(col[0], col[1], col[2], alpha);
      ellipse(0, 0, this.r * 2.1, this.r * 1.2);
      noStroke();
      fill(220, 240, 255, min(alpha, 200));
      ellipse(0, -this.r * 0.35, this.r * 1.0, this.r * 0.75);
      fill(140, 200, 255, min(alpha, 70));
      ellipse(0, this.r * 0.35, this.r * 1.6, this.r * 0.65);
    } else {
      let flame = 0.55 + 0.45 * sin(this.phase * 1.7);
      let flameLen = this.r * (0.8 + 0.9 * flame);
      blendMode(ADD);
      fill(140, 200, 255, min(alpha, 18));
      ellipse(0, this.r * 0.55 + flameLen * 0.35, this.r * 1.05, this.r * 1.35);
      fill(180, 220, 255, min(alpha, 14));
      ellipse(0, this.r * 0.55 + flameLen * 0.55, this.r * 0.75, this.r * 1.05);
      blendMode(BLEND);
      fill(140, 200, 255, min(alpha, 55));
      triangle(-this.r * 0.5, this.r * 0.55, this.r * 0.5, this.r * 0.55, 0, this.r * 0.55 + flameLen);
      fill(255, 220, 120, min(alpha, 120));
      triangle(-this.r * 0.3, this.r * 0.55, this.r * 0.3, this.r * 0.55, 0, this.r * 0.55 + flameLen * 0.65);

      fill(col[0], col[1], col[2], alpha);
      stroke(180, 220, 255, min(alpha, 65));
      strokeWeight(1.5);
      beginShape();
      vertex(0, -this.r * 1.0);
      vertex(-this.r * 0.75, this.r * 0.55);
      vertex(0, this.r * 0.25);
      vertex(this.r * 0.75, this.r * 0.55);
      endShape(CLOSE);

      noStroke();

      fill(220, 240, 255, min(alpha, 190));
      ellipse(0, -this.r * 0.22, this.r * 0.5, this.r * 0.7);
    }

    if (this.isElite) {
      noFill();
      stroke(255, 255, 255, min(alpha, 140));
      strokeWeight(2);
      circle(0, 0, this.r * 2.25);
    }

    pop();

    let maxHp = max(this.maxHp || 0, this.hp);
    if (this.isBoss) maxHp = max(maxHp, 800);
    let hpPct = max(0, min(1, this.hp / maxHp));
    if (hpPct < 1 || this.isBoss || this.isElite) {
      stroke(0, 0, 0, min(alpha, 220));
      strokeWeight(2);
      fill(255, 60, 60, min(alpha, 220));
      rectMode(CENTER);
      rect(this.pos.x, this.pos.y - this.r - 16, 56 * hpPct, 7, 4);
      rectMode(CORNER);
    }

    pop();
  }
}

class SnakeSegment extends Vehicule {
  constructor(x, y, r) {
    super(x, y);
    this.vel = p5.Vector.random2D().mult(0.2);
    this.r = r;
    this.maxSpeed = 2.4;
    this.maxForce = 0.22;
    this.lookAhead = 85;
    this.hp = 14;
    this.dead = false;
  }

  avoid(obstacles) {
    return super.avoidObstacles(obstacles, this.lookAhead);
  }

  separation(others, desiredSeparation) {
    let steer = super.separate(others, desiredSeparation);
    steer.limit(this.maxForce * 1.6);
    return steer;
  }

  update(slowFactor = 1) {
    super.update();
    if (slowFactor !== 1) {
      this.pos.add(p5.Vector.mult(this.vel, slowFactor - 1));
    }
  }

  resolveObstacleCollision(obstacle) {
    let delta = p5.Vector.sub(this.pos, obstacle.pos);
    let dist = delta.mag();
    let minDist = this.r + obstacle.r;
    if (dist === 0) {
      delta = p5.Vector.random2D();
      dist = 0.0001;
    }
    if (dist < minDist) {
      delta.setMag(minDist - dist + 0.1);
      this.pos.add(delta);
      this.vel.mult(0.85);
    }
  }

  draw(alpha, isHead) {
    push();
    let a = min(alpha, 255);

    noStroke();
    fill(isHead ? 255 : 220, isHead ? 180 : 140, isHead ? 80 : 70, min(a, 55));
    circle(this.pos.x, this.pos.y, this.r * 3.1);

    let v = this.vel.copy();
    let heading = (v.mag() > 0.12 ? v.heading() : 0) + HALF_PI;
    push();
    translate(this.pos.x, this.pos.y);
    rotate(heading);

    if (isHead) fill(255, 180, 80, a);
    else fill(200, 120, 80, a);

    beginShape();
    vertex(0, -this.r * 1.0);
    vertex(-this.r * 0.75, this.r * 0.6);
    vertex(0, this.r * 0.25);
    vertex(this.r * 0.75, this.r * 0.6);
    endShape(CLOSE);

    fill(255, 240, 200, min(a, 190));
    ellipse(0, -this.r * 0.22, this.r * 0.52, this.r * 0.72);

    pop();
    pop();
  }
}

class Snake {
  constructor(x, y, len = 8) {
    this.segments = [];
    let r0 = 15;
    for (let i = 0; i < len; i++) {
      let r = max(9, r0 - i * 0.6);
      this.segments.push(new SnakeSegment(x - i * (r0 * 1.35), y, r));
    }

    this.seekWeight = 1.1;
    this.avoidWeight = 2.2;
    this.sepWeight = 1.6;
    this.followWeight = 1.35;
    this.gap = 22;

    this.touchDamage = 12;
    this.dead = false;
  }

  getHead() {
    return this.segments[0];
  }

  update(obstacles, targetPos, slowFactor = 1) {
    if (this.dead) return;

    let head = this.getHead();
    let headForce = createVector(0, 0);

    headForce.add(p5.Vector.mult(head.seek(targetPos), this.seekWeight));
    headForce.add(p5.Vector.mult(head.avoid(obstacles), this.avoidWeight));
    headForce.add(p5.Vector.mult(head.separation(this.segments, head.r * 2.2), this.sepWeight));
    headForce.limit(head.maxForce * 4);
    head.applyForce(headForce);
    head.update(slowFactor);

    if (obstacles && obstacles.length) {
      for (let obs of obstacles) head.resolveObstacleCollision(obs);
    }

    for (let i = 1; i < this.segments.length; i++) {
      let seg = this.segments[i];
      let prev = this.segments[i - 1];
      let toPrev = p5.Vector.sub(prev.pos, seg.pos);
      let d = toPrev.mag();

      let followTarget = prev.pos.copy();
      if (d > 0) {
        let back = toPrev.copy().normalize().mult(-this.gap);
        followTarget.add(back);
      }

      let f = createVector(0, 0);
      f.add(p5.Vector.mult(seg.arrive(followTarget, 70), this.followWeight));
      f.add(p5.Vector.mult(seg.avoid(obstacles), this.avoidWeight * 0.7));
      f.add(p5.Vector.mult(seg.separation(this.segments, seg.r * 2.0), this.sepWeight));
      f.limit(seg.maxForce * 4);
      seg.applyForce(f);
      seg.update(slowFactor);

      if (obstacles && obstacles.length) {
        for (let obs of obstacles) seg.resolveObstacleCollision(obs);
      }
    }

    this.segments = this.segments.filter(s => !s.dead);
    if (this.segments.length === 0) this.dead = true;
  }

  draw(alpha) {
    if (this.dead) return;
    for (let i = this.segments.length - 1; i >= 0; i--) {
      let seg = this.segments[i];
      seg.draw(alpha, i === 0);
    }
  }
}
