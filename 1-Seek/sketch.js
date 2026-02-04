let target, vehicle;
let vehicles = [];

let vitesseMaxSlider;
let forceMaxSlider;

function creerVehicules(nb) {
  vehicles = [];
  for (let i = 0; i < nb; i++) {
    vehicles.push(new Vehicle(random(width), random(height)));
  }
}


// la fonction setup est appelée une fois au démarrage du programme par p5.js
function setup() {
  // on crée un canvas de 800px par 800px
  createCanvas(windowWidth, windowHeight);

  // On crée un véhicule à la position (100, 100)
  //vehicle = new Vehicle(100, 100);

  // TODO: créer un tableau de véhicules en global
  // ajouter nb vehicules au tableau dans une boucle
  // avec une position random dans le canvas
  

  // La cible est un vecteur avec une position aléatoire dans le canvas
  // dirigée par la souris ensuite dans draw()
  //target = createVector(random(width), random(height));

  // Cible qui se déplace aléatoirement, instance Target
  target = createVector(random(width), random(height));

  // On crée un véhicule à une position aléatoire
  vehicle = new Vehicle(random(width), random(height));

  // Plusieurs véhicules suiveurs
  creerVehicules(10);

  // Sliders pour régler la vitesse max et la force max
  // On crée le slider et on le positionne
  // Les parametres sont : valeur min, valeur max, 
  // valeur initiale, pas
  vitesseMaxSlider = createSlider(1, 20, 4, 1);
  vitesseMaxSlider.position(20, 10);
  vitesseMaxSlider.size(120);

  let labelVitesseMax = createDiv('Vitesse Max:');
  labelVitesseMax.position(150, 6);
  labelVitesseMax.style('color', 'white');
  labelVitesseMax.style('font-size', '14px');

  forceMaxSlider = createSlider(0.01, 1, 0.1, 0.01);
  forceMaxSlider.position(20, 40);
  forceMaxSlider.size(120);

  let labelForceMax = createDiv('Force Max:');
  labelForceMax.position(150, 36);
  labelForceMax.style('color', 'white');
  labelForceMax.style('font-size', '14px');
}

  // la fonction draw est appelée en boucle par p5.js, 60 fois par seconde par défaut
  // Le canvas est effacé automatiquement avant chaque appel à draw
  function draw() {
    // fond noir pour le canvas
    background("black");

    // Applique les valeurs des sliders
    const maxSpeed = vitesseMaxSlider.value();
    const maxForce = forceMaxSlider.value();
    vehicle.maxSpeed = maxSpeed;
    vehicle.maxForce = maxForce;
    for (let v of vehicles) {
      v.maxSpeed = maxSpeed;
      v.maxForce = maxForce;
    }

    // A partir de maintenant toutes les formes pleines seront en rouge
    fill("red");
    // pas de contours pour les formes.
    noStroke();

    // mouseX et mouseY sont des variables globales de p5.js, elles correspondent à la position de la souris
    // on les stocke dans un vecteur pour pouvoir les utiliser avec la méthode seek (un peu plus loin)
    // du vehicule
    target.x = mouseX;
    target.y = mouseY;

    // Dessine un cercle de rayon 32px à la position de la souris
    // la couleur de remplissage est rouge car on a appelé fill(255, 0, 0) plus haut
    // pas de contours car on a appelé noStroke() plus haut
    //circle(target.x, target.y, 32);

    // On dessine la cible instance de Target. C'est un Vehicle
    // donc elle a une position, une vitesse, une accélération
    // on dessine la target sous la forme d'un cercle rouge
    circle(target.x, target.y, 32);

    
      // je déplace et dessine le véhicule
      vehicle.applyBehaviors(target);
      vehicle.update();

    
    // Si le vehicule sort de l'écran
    vehicle.edges();

    // Si le véhicule atteint la target, il réapparaît ailleurs
    if (vehicle.pos.dist(target) < vehicle.r + 16) {
      vehicle.pos.set(random(width), random(height));
      vehicle.vel.set(0, 0);
      vehicle.acc.set(0, 0);
    }

    // On dessine le véhicule
    vehicle.show();

    // Plusieurs véhicules suiveurs
    for (let v of vehicles) {
      v.applyBehaviors(target);
      v.update();
      v.edges();
      v.show();
    }
    
  };

