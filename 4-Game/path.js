function findProjection(pos, a, b) {
  let v1 = p5.Vector.sub(a, pos);
  let v2 = p5.Vector.sub(b, pos);
  v2.normalize();
  let sp = v1.dot(v2);
  v2.mult(sp);
  v2.add(pos);
  return v2;
}

class Path {
  constructor(points, radius = 40) {
    this.points = points;
    this.radius = radius;
  }

  show() {
    push();
    noFill();
    stroke(0, 200, 255, 120);
    strokeWeight(this.radius * 2);
    strokeCap(ROUND);
    strokeJoin(ROUND);
    beginShape();
    this.points.forEach(p => vertex(p.x, p.y));
    endShape();

    stroke(0, 220, 255, 200);
    strokeWeight(3);
    beginShape();
    this.points.forEach(p => vertex(p.x, p.y));
    endShape();
    pop();
  }
}
