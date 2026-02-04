let pursuer1, pursuer2;
let target;
let obstacles = [];
let vehicules = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pursuer1 = new Vehicle(100, 100);
  pursuer2 = new Vehicle(random(width), random(height));

  vehicules.push(pursuer1);
  //vehicules.push(pursuer2);

  // On cree un obstace au milieu de l'écran
  // un cercle de rayon 100px
  // TODO
  obstacles.push(new Obstacle(width / 2, height / 2, 100, "green"));

  // Curseur pour régler la force de séparation
  creerSliderPourProprieteVehicules(
    'Force de séparation:', 'separateWeight', 0, 5, 0.8, 0.1, 10, 10);
}

function creerSliderPourProprieteVehicules(labelText, propertyName,
  min, max, initialValue, step, posX, posY) {
  let slider = createSlider(min, max, initialValue, step);
  slider.position(posX + 200, posY);
  slider.size(180);

  let label = createDiv(labelText);
  label.position(posX, posY - 3);
  label.style('color', 'white');
  label.style('font-size', '20px');

  let valueDisplay = createDiv(slider.value());
  valueDisplay.position(posX + 390, posY - 3);
  valueDisplay.style('color', 'white');
  valueDisplay.style('font-size', '20px');

  // Ecouteur d'événement pour mettre à jour la valeur affichée
  slider.input(() => {
    valueDisplay.html(slider.value());
    // on met à jour la propriété de tous les véhicules
    vehicules.forEach(v => {
      v[propertyName] = slider.value();
    });
  });
}

function draw() {
  // changer le dernier param (< 100) pour effets de trainée
  background(0, 0, 0, 100);

  target = createVector(mouseX, mouseY);

  // Dessin de la cible qui suit la souris
  // Dessine un cercle de rayon 32px à la position de la souris
  fill(255, 0, 0);
  noStroke();
  circle(target.x, target.y, 32);

  // dessin des obstacles
  // TODO
  obstacles.forEach(o => {
    o.show();
  })

  vehicules.forEach(v => {
    // pursuer = le véhicule poursuiveur, il vise un point devant la cible
    v.applyBehaviors(target, obstacles, vehicules);

    // déplacement et dessin du véhicule et de la target
    v.update();
    v.show();
  });
}

function mousePressed() {
  // TODO : ajouter un obstacle de taille aléatoire à la position de la souris
  obstacles.push(new Obstacle(mouseX, mouseY, random(20, 100), "green"));
}

function keyPressed() {
  if (key == "v") {
    vehicules.push(new Vehicle(random(width), random(height)));
  } else if (key == "d") {
    Vehicle.debug = !Vehicle.debug;
  } else if (key == "f") {
    // on crée 10 véhicules à des position random espacées de 50px
    // en x = 20, y = hauteur du  canvas sur deux
    for (let i = 0; i < 10; i++) {
      let v = new Vehicle(20, 300)
      // vitesse aléatoire
      v.vel = new p5.Vector(random(1, 5), random(1, 5));
      vehicules.push(v);
    }
  } else if (key == "w") {
    // on cree un véhicule avec wander
    let v = new Vehicle(random(width), random(height));
    v.wanderForceWeight = 1.0;
    v.color = "pink";
    v.r_pourDessin = 25;
    v.r = 75;
    vehicules.push(v);
  } else if(key == "s") {
        let v = new Vehicle(random(width), random(height));
        v.maxSpeed = 8;
        v.color = "red";
        v.r_pourDessin = 25;
         v.r = 40;
        vehicules.push(v);
  }
}