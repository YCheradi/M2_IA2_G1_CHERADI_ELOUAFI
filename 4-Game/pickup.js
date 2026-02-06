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
    else if (this.type === 'shield') fill(255, 240, 140, a);
    else if (this.type === 'slow') fill(180, 160, 255, a);
    else if (this.type === 'invuln') fill(255, 255, 255, a);
    else if (this.type === 'overdrive') fill(255, 140, 80, a);
    else fill(255, 120, 120, a);
    circle(this.pos.x, this.pos.y, this.r * 2.6);

    noStroke();
    fill(255, 255, 255, min(alpha, 220));
    push();
    translate(this.pos.x, this.pos.y);
    if (this.type === 'heal') {
      rectMode(CENTER);
      rect(0, 0, this.r * 1.0, this.r * 0.28, 2);
      rect(0, 0, this.r * 0.28, this.r * 1.0, 2);
      rectMode(CORNER);
    } else if (this.type === 'magnet') {
      arc(0, 0, this.r * 1.2, this.r * 1.2, PI * 0.15, PI * 0.85);
      rectMode(CENTER);
      rect(-this.r * 0.33, -this.r * 0.05, this.r * 0.25, this.r * 0.55, 2);
      rect(this.r * 0.33, -this.r * 0.05, this.r * 0.25, this.r * 0.55, 2);
      rectMode(CORNER);
    } else if (this.type === 'bomb') {
      circle(0, 0, this.r * 0.95);
      rectMode(CENTER);
      rect(this.r * 0.18, -this.r * 0.55, this.r * 0.55, this.r * 0.22, 2);
      rectMode(CORNER);
    } else if (this.type === 'shield') {
      beginShape();
      vertex(0, -this.r * 0.65);
      vertex(this.r * 0.55, -this.r * 0.2);
      vertex(this.r * 0.35, this.r * 0.65);
      vertex(0, this.r * 0.85);
      vertex(-this.r * 0.35, this.r * 0.65);
      vertex(-this.r * 0.55, -this.r * 0.2);
      endShape(CLOSE);
    } else if (this.type === 'slow') {
      circle(0, 0, this.r * 0.9);
      stroke(0, 0, 0, min(alpha, 160));
      strokeWeight(2);
      line(0, 0, 0, -this.r * 0.35);
      line(0, 0, this.r * 0.28, 0);
    } else if (this.type === 'invuln') {
      noFill();
      stroke(0, 0, 0, min(alpha, 160));
      strokeWeight(2);
      circle(0, 0, this.r * 1.1);
      noStroke();
      fill(0, 0, 0, min(alpha, 140));
      beginShape();
      vertex(0, -this.r * 0.65);
      vertex(this.r * 0.55, -this.r * 0.2);
      vertex(this.r * 0.35, this.r * 0.65);
      vertex(0, this.r * 0.85);
      vertex(-this.r * 0.35, this.r * 0.65);
      vertex(-this.r * 0.55, -this.r * 0.2);
      endShape(CLOSE);
    } else if (this.type === 'overdrive') {
      stroke(0, 0, 0, min(alpha, 160));
      strokeWeight(2);
      line(-this.r * 0.15, -this.r * 0.7, this.r * 0.15, -this.r * 0.2);
      line(this.r * 0.15, -this.r * 0.2, -this.r * 0.05, -this.r * 0.2);
      line(-this.r * 0.05, -this.r * 0.2, this.r * 0.05, this.r * 0.65);
    }
    pop();
    pop();
  }
}
