let nbVehicules = 20;
let target;
let vehicle;
let vehicles = [];
let snakes = [];
let vehiclesWander = [];
// Texte
let font;
let points = [];
// mode (snake ou text)
let mode = "snake";


// Appelée avant de démarrer l'animation
function preload() {
  // en général on charge des images, des fontes de caractères etc.
  font = loadFont('./assets/inconsolata.otf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // on crée un snake
  let snake = new Snake(width / 2, height / 2, 30, 30, 'lime');
  snakes.push(snake);

  // La cible, ce sera la position de la souris
  target = createVector(random(width), random(height));

  // On creer un tableau de points à partir du texte
  // Texte qu'on affiche avec textToPoint
  // Get the point array.
  // parameters are : text, x, y, fontSize, options. 
  // sampleFactor : 0.01 = gros points, 0.1 = petits points
  // ca représente la densité des points
  points = font.textToPoints('Hello!', 350, 250, 305, { sampleFactor: 0.03 });

  // on cree des vehicules, autant que de points
  creerVehicules(points.length);
}

function creerVehicules(n) {
  for (let i = 0; i < n; i++) {
    let v = new Vehicle(random(width), random(height));
    vehicles.push(v);
  }

}

// appelée 60 fois par seconde
function draw() {
  // couleur pour effacer l'écran
  background(0);
  // pour effet psychedelique
  //background(0, 0, 0, 10);

  // On affiche le texte avec des cercles définis par le tableau points
  points.forEach(pt => {
    push();
    fill("grey");
    noStroke();
    circle(pt.x, pt.y, 15);
    pop();
  });

  switch (mode) {
    case "snake":

 // Cible qui suit la souris, cercle rouge de rayon 32
  target.x = mouseX;
  target.y = mouseY;

  // dessin de la cible
  push();
  fill(255, 0, 0);
  noStroke();
  ellipse(target.x, target.y, 32);
  pop();

  vehicles.forEach((vehicle, index) => {
    // si on a affaire au premier véhicule
    // alors il suit la souris (target)
    let steeringForce;

    if (index === 0) {
      // le premier véhicule suit la souris avec arrivée
      steeringForce = vehicle.arrive(target);
    } else {
      // Je suis un suiveur, je poursuis le véhicule 
      // précédent avec arrivée
      let vehiculePrecedent = vehicles[index - 1];
      steeringForce = vehicle.arrive(vehiculePrecedent.pos, 30);
    }
    
    vehicle.applyForce(steeringForce);
    vehicle.update();
    vehicle.show();
  })

  // Déplacement du snake (si présent)
  snakes.forEach(s => {
    s.move(target);
    s.show();
  });
      break;

    case "text":
      vehicles.forEach((vehicle, index) => {
        // chaque véhicule vise un point du texte
        let pt = points[index];
        let target = createVector(pt.x, pt.y);
        let steeringForce = vehicle.arrive(target);
        vehicle.applyForce(steeringForce);
        vehicle.update();
        vehicle.show();
      });
      break;
  }
 
}

function keyPressed() {
  if (key === 'd') {
    Vehicle.debug = !Vehicle.debug;
  } else if(key === 'w') {
    if (vehiclesWander) {
      // Je crée un nouveau véhicule en mode wander
      let v = new Vehicle(random(width), random(height));
      v.r = 60; // plus grand
      v.couleur = color(0, 255, 0); // vert
      vehiclesWander.push(v);
    }
  } else if (key === 's') {
    mode = "snake";
  } else if (key === 't') {
    mode = "text";
  }
}