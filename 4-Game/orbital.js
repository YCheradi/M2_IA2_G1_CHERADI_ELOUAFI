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
