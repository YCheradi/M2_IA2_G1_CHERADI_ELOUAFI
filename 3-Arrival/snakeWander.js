class SnakeWander extends Snake {
    constructor(x, y, length, taille, couleur) {
        super(x, y, length, taille, couleur);
    }

    move() {
        // La tête erre
        let force = this.head.wander();
        this.head.applyForce(force);
        this.head.update();

        // Chaque anneau suit l'anneau précédent
        for (let i = 1; i < this.anneaux.length; i++) {
            let anneau = this.anneaux[i];
            let anneauPrecedent = this.anneaux[i - 1];
            let forceSuivi = anneau.arrive(anneauPrecedent.pos, 15);
            anneau.applyForce(forceSuivi);
            anneau.update();
        }
    }
}