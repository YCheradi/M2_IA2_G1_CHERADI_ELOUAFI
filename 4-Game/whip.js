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
