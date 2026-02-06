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
    let glow = 80 + 55 * sin(this.phase);
    if (this.value >= 4) fill(80, 255, 160, min(alpha, 65));
    else if (this.value >= 2) fill(80, 180, 255, min(alpha, 65));
    else fill(180, 180, 255, min(alpha, 65));
    circle(this.pos.x, this.pos.y, this.r * 3.0);

    if (this.value >= 4) fill(80, 255, 160, alpha);
    else if (this.value >= 2) fill(80, 180, 255, alpha);
    else fill(180, 180, 255, alpha);
    circle(this.pos.x, this.pos.y, this.r * 2);

    fill(255, 255, 255, min(alpha, glow));
    push();
    translate(this.pos.x, this.pos.y);
    rotate(PI / 4);
    rectMode(CENTER);
    rect(0, 0, this.r * 0.9, this.r * 0.9, 3);
    rectMode(CORNER);
    pop();
    pop();
  }
}
