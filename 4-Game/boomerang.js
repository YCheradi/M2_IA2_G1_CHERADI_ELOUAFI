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
