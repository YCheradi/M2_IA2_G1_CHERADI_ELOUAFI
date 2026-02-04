let target, vehicle;


// la fonction setup est appelée une fois au démarrage du programme par p5.js
function setup() {
  // on crée un canvas de 800px par 800px
  createCanvas(windowWidth, windowHeight);

  // On crée un véhicule à la position (100, 100)
  //vehicle = new Vehicle(100, 100);

  // TODO: créer un tableau de véhicules en global
  // ajouter nb vehicules au tableau dans une boucle
  // avec une position random dans le canvas
  creerVehicules(10);

  // La cible est un vecteur avec une position aléatoire dans le canvas
  // dirigée par la souris ensuite dans draw()
  //target = createVector(random(width), random(height));

  // Cible qui se déplace aléatoirement, instance Target
  target = new Target(random(width), random(height));

  // On crée un véhicule à une position aléatoire
  vehicle = new Vehicle(random(width), random(height));

  // Plusieurs véhicules suiveurs
  creerVehicules(10);

  // Sliders pour régler la vitesse max et la force max
  // On crée le slider et on le positionne
  // Les parametres sont : valeur min, valeur max,
  // valeur initiale, pas
  

 
}

  // la fonction draw est appelée en boucle par p5.js, 60 fois par seconde par défaut
  // Le canvas est effacé automatiquement avant chaque appel à draw
  function draw() {
    // fond noir pour le canvas
    background("black");

  // A partir de maintenant toutes les formes pleines seront en rouge
  fill("red");
  // pas de contours pour les formes.
  noStroke();

  // mouseX et mouseY sont des variables globales de p5.js, elles correspondent à la position de la souris
  // on les stocke dans un vecteur pour pouvoir les utiliser avec la méthode seek (un peu plus loin)
  // du vehicule
  //target.x = mouseX;
  //target.y = mouseY;

  // Dessine un cercle de rayon 32px à la position de la souris
  // la couleur de remplissage est rouge car on a appelé fill(255, 0, 0) plus haut
  // pas de contours car on a appelé noStroke() plus haut
  //circle(target.x, target.y, 32);

  // On dessine la cible instance de Target. C'est un Vehicle
  // donc elle a une position, une vitesse, une accélération
  // on dessine la target sous la forme d'un cercle rouge
  target.show();
  target.update();
  target.edges(); // pour ne pas sortir de l'écran

  vehicles.forEach(vehicle => {
    // On règle la vitesse max du véhicule avec la valeur du slider
    vehicle.maxSpeed = vitesseMaxSlider.value();
    // on affiche la valeur du slider à droite du slider
    fill("white");
    textSize(14);
    textAlign(LEFT);
    text(vehicle.maxSpeed, vitesseMaxSlider.x + vitesseMaxSlider.width + 10, vitesseMaxSlider.y + 15);  

    // On règle la force max du véhicule avec la valeur du slider
    vehicle.maxForce = forceMaxSlider.value();
    // on affiche la valeur du slider à droite du slider
    fill("white");
    textSize(14);
    textAlign(LEFT);
    text(vehicle.maxForce, forceMaxSlider.x + forceMaxSlider.width + 10, forceMaxSlider.y + 15);  

    // afficher le nombre de véhicules en haut à gauche à droite du curseur
    fill("white");
    textSize(14);
    textAlign(LEFT);
    text(nbVehicules, 170, 25);

    // je déplace et dessine le véhicule
    vehicle.applyBehaviors(target.pos);
    vehicle.update();

    // Si le vehicule a touché la target/souris, il réapparaît à une position aléatoire
    let d = p5.Vector.dist(vehicle.pos, target.pos);
    if (d < vehicle.r + 16) { // 16 est le rayon du cercle de la cible
      // position aléatoire
      vehicle.pos = createVector(random(width), random(height));
    }

    // Si le vehicule sort de l'écran
    vehicle.edges();

    // On dessine le véhicule
    vehicle.show();
    
  };

