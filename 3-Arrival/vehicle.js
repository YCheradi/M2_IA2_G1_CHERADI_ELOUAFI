class Vehicle {
  static debug = false;

  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.maxForce = 0.2;
    this.r = 16;
    this.rayonZoneDeFreinage = 100;
    this.couleur = color(255);
  }

  evade(vehicle) {
    let pursuit = this.pursue(vehicle);
    pursuit.mult(-1);
    return pursuit;
  }

  pursue(vehicle) {
    let target = vehicle.pos.copy();
    let prediction = vehicle.vel.copy();
    prediction.mult(10);
    target.add(prediction);
    fill(0, 255, 0);
    circle(target.x, target.y, 16);
    return this.seek(target);
  }

  arrive(target, d=0) {
    // 2nd argument true enables the arrival behavior
    // 3rd argument d is the distance behind the target
    // for "snake" behavior
    return this.seek(target, true, d);
  }

  flee(target) {
    // Craig Reynolds : on inverse la vitesse désirée, pas la force
    let desiredSpeed = p5.Vector.sub(this.pos, target);
    desiredSpeed.setMag(this.maxSpeed);
    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  separate(vehicles, desiredSeparation = 40) {
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      if (other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) {
      steer.div(count);
    }
    if (steer.mag() > 0) {
      steer.setMag(this.maxSpeed);
      steer.sub(this.vel);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  align(vehicles, neighborDist = 60) {
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      if (other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < neighborDist) {
        sum.add(other.vel);
        count++;
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
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of vehicles) {
      if (other === this) continue;
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < neighborDist) {
        sum.add(other.pos);
        count++;
      }
    }
    if (count === 0) return createVector(0, 0);
    sum.div(count);
    return this.seek(sum);
  }

  flock(vehicles) {
    let sep = this.separate(vehicles, 40);
    let ali = this.align(vehicles, 70);
    let coh = this.cohesion(vehicles, 70);
    sep.mult(1.4);
    ali.mult(1.0);
    coh.mult(0.8);
    let force = createVector(0, 0);
    force.add(sep);
    force.add(ali);
    force.add(coh);
    force.limit(this.maxForce * 3);
    return force;
  }

  avoidObstacles(obstacles, lookAhead = 80) {
    if (!obstacles || obstacles.length === 0) return createVector(0, 0);
    if (this.vel.mag() === 0) return createVector(0, 0);

    let ahead = this.vel.copy();
    ahead.setMag(lookAhead);
    ahead.add(this.pos);

    let threat = null;
    let minD = Infinity;
    for (let obs of obstacles) {
      let d = p5.Vector.dist(ahead, obs.pos);
      if (d < obs.r + this.r) {
        if (d < minD) {
          minD = d;
          threat = obs;
        }
      }
    }

    if (!threat) return createVector(0, 0);

    let desired = p5.Vector.sub(ahead, threat.pos);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce * 2);
    return steer;
  }

  followPath(pathPoints, pathRadius = 40, predictDist = 40) {
    if (!pathPoints || pathPoints.length < 2) return createVector(0, 0);

    let predict = this.vel.copy();
    if (predict.mag() === 0) {
      predict = createVector(1, 0);
    }
    predict.setMag(predictDist);
    let predictLoc = p5.Vector.add(this.pos, predict);

    let normalPoint = null;
    let targetPoint = null;
    let worldRecord = Infinity;

    for (let i = 0; i < pathPoints.length - 1; i++) {
      let a = pathPoints[i];
      let b = pathPoints[i + 1];

      let ap = p5.Vector.sub(predictLoc, a);
      let ab = p5.Vector.sub(b, a);
      ab.normalize();
      ab.mult(ap.dot(ab));
      let normal = p5.Vector.add(a, ab);

      let distToSegment = p5.Vector.dist(predictLoc, normal);
      if (distToSegment < worldRecord) {
        worldRecord = distToSegment;
        normalPoint = normal;
        let dir = p5.Vector.sub(b, a);
        dir.normalize();
        dir.mult(30);
        targetPoint = p5.Vector.add(normal, dir);
      }
    }

    if (normalPoint && worldRecord > pathRadius) {
      return this.seek(targetPoint);
    }
    return createVector(0, 0);
  }

  seek(target, arrival = false, d=0) {
    let valueDesiredSpeed = this.maxSpeed;

    if (arrival) {
      // On définit un rayon de 100 pixels autour de la cible
      // si la distance entre le véhicule courant et la cible
      // est inférieure à ce rayon, on ralentit le véhicule
      // desiredSpeed devient inversement proportionnelle à la distance
      // si la distance est petite, force = grande
      // Vous pourrez utiliser la fonction P5 
      // distance = map(valeur, valeurMin, valeurMax, nouvelleValeurMin, nouvelleValeurMax)
      // qui prend une valeur entre valeurMin et valeurMax et la transforme en une valeur
      // entre nouvelleValeurMin et nouvelleValeurMax

      // 1 - dessiner le cercle de rayon 100 autour de la target
      if (Vehicle.debug) {
        push();
        stroke(255, 255, 255);
        noFill();
        circle(target.x, target.y, this.rayonZoneDeFreinage);
        pop();
      }

      // 2 - calcul de la distance entre la cible et le véhicule
      let distance = p5.Vector.dist(this.pos, target);

      // 3 - si distance < rayon du cercle, alors on modifie desiredSPeed
      // qui devient inversement proportionnelle à la distance.
      // si d = rayon alors desiredSpeed = maxSpeed
      // si d = 0 alors desiredSpeed = 0
      // map fait exactement ça: 
      // les paramètres sont:
      // la valeur à transformer (ici distance)
      // la valeur min de cette valeur (ici 0)
      // la valeur max de cette valeur (ici this.rayonZoneDeFreinage)
      // la nouvelle valeur min (ici 0)
      // la nouvelle valeur max (ici this.maxSpeed)
      if (distance < this.rayonZoneDeFreinage) {
        valueDesiredSpeed = map(distance, d, this.rayonZoneDeFreinage, 0, this.maxSpeed);
      }
    }

    // Ici on calcule la force à appliquer au véhicule
    // pour aller vers la cible (avec ou sans arrivée)
    // un vecteur qui va vers la cible, c'est pour le moment la vitesse désirée
    let desiredSpeed = p5.Vector.sub(target, this.pos);
    desiredSpeed.setMag(valueDesiredSpeed);
   
    // Force = desiredSpeed - currentSpeed
    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  show() {
    
    stroke(255);
    strokeWeight(2);
    fill(this.couleur);
    stroke(0);
    strokeWeight(2);
    push();
    translate(this.pos.x, this.pos.y);
    if(this.vel.mag() > 0.2)
      rotate(this.vel.heading());

    triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    pop();
    /*
   push();
   // on dessine le vehicule comme un cercle
   fill("blue");
   stroke("white");
   strokeWeight(2);
   translate(this.pos.x, this.pos.y);
   circle(0, 0, this.r * 2);  
   pop();
   */
  }

  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }
}

class Target extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(5);
  }

  show() {
    stroke(255);
    strokeWeight(2);
    fill("#F063A4");
    push();
    translate(this.pos.x, this.pos.y);
    circle(0, 0, this.r * 2);
    pop();
  }
}