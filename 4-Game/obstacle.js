class Obstacle {
  constructor(x, y, r, opts = {}) {
    this.pos = createVector(x, y);
    this.r = r;

    this.img = opts.img || null;

    this.baseColor = opts.baseColor || [200, 200, 220];
    this.detailColor = opts.detailColor || [255, 255, 255];
    this.hasRing = !!opts.hasRing;
    this.ringTilt = opts.ringTilt ?? 0.35;
    this.ringColor = opts.ringColor || [255, 255, 255];
    this.atmoColor = opts.atmoColor || [120, 180, 255];
  }

  show() {
    push();
    noStroke();

    if (this.img) {
      imageMode(CENTER);
      tint(255, 255);
      image(this.img, this.pos.x, this.pos.y, this.r * 2.2, this.r * 2.2);

      if (this.hasRing) {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.ringTilt);
        noFill();
        stroke(this.ringColor[0], this.ringColor[1], this.ringColor[2], 120);
        strokeWeight(max(2, this.r * 0.06));
        ellipse(0, 0, this.r * 3.0, this.r * 1.05);
        pop();
      }

      pop();
      return;
    }

    fill(
  lerp(this.atmoColor[0], 200, 0.45),
  lerp(this.atmoColor[1], 210, 0.45),
  lerp(this.atmoColor[2], 230, 0.45),
  22
);
    circle(this.pos.x, this.pos.y, this.r * 2.5);

    let ctx = drawingContext;
    let lx = this.pos.x - this.r * 0.55;
    let ly = this.pos.y - this.r * 0.65;
    let grad = ctx.createRadialGradient(lx, ly, this.r * 0.15, this.pos.x, this.pos.y, this.r * 1.2);
    grad.addColorStop(0, `rgba(${this.detailColor[0]}, ${this.detailColor[1]}, ${this.detailColor[2]}, 0.95)`);
    grad.addColorStop(0.38, `rgba(${this.baseColor[0]}, ${this.baseColor[1]}, ${this.baseColor[2]}, 0.92)`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fill();

    fill(0, 0, 0, 55);
    circle(this.pos.x + this.r * 0.18, this.pos.y + this.r * 0.22, this.r * 2.0);

    fill(this.detailColor[0], this.detailColor[1], this.detailColor[2], 90);
    circle(this.pos.x - this.r * 0.3, this.pos.y - this.r * 0.35, this.r * 0.55);

    if (this.hasRing) {
      push();
      translate(this.pos.x, this.pos.y);
      rotate(this.ringTilt);
      noFill();
      stroke(this.ringColor[0], this.ringColor[1], this.ringColor[2], 120);
      strokeWeight(max(2, this.r * 0.08));
      ellipse(0, 0, this.r * 3.2, this.r * 1.1);
      pop();
    }
    pop();
  }
}
