# Star Wars: BattleSpace

## Auteurs

- **CHERADI Yassine**
- **EL OUAFI Yasmine**

## lien du projet

https://github.com/YCheradi/M2_IA2_G1_CHERADI_ELOUAFI

## lien Youtube

https://youtu.be/98KA1S-qN7U

## lien itch.io

https://yassinecheradi.itch.io/star-wars-battlespace

## Présentation du projet

**Star Wars: BattleSpace** est un jeu 2D type *survivor* réalisé avec **p5.js**.

Le principe:

- Le joueur contrôle un vaisseau.
- Les ennemis apparaissent en vagues et poursuivent le joueur.
- L’arme tire automatiquement.
- Le joueur récupère des **gemmes XP** pour **monter de niveau** et choisir des **améliorations**.
- Des récompenses temporaires (Weapons / Spells / Ship / Explosive / Ally) permettent de varier le gameplay.

Le projet inclut:

- Intégration de **sprites** (joueur, ennemis, projectiles, explosions).
- Effets visuels (bloom, hyperspace, shimmer, effets plein écran).
- Système d’**aides** (récompenses) et d’**améliorations**.
- Système de **sons** (SFX) + musique de fond.
- UI (menu, game over, level up, choix des cartes) personnalisée.

## Installation / Lancement

### Prérequis

- Un navigateur moderne (Chrome/Edge/Firefox)
- Servir le dossier via un serveur local (pour éviter les restrictions de chargement)

### Lancer le jeu

- Ouvrir le dossier `4-Game/` avec un serveur local.
- Accéder à `4-Game/index.html`.

Exemples de serveurs locaux:

- Extension VSCode “Live Server”
- `python -m http.server` (Python installé)

## Commandes / Contrôles

- **Déplacement**: `ZQSD`
- **Dash**: `Shift`
- **Pause**: `P`
- **Choix des cartes (level up / récompense / shop)**: `1` / `2` / `3` ou clic
- **Mode Casual**: `C`
- **Mute SFX**: `M`

## Comportement et mise en situation

### Quand et comment le jeu se déroule

- Au démarrage, le joueur arrive dans l’écran d’accueil.
- En lançant la partie, le joueur commence avec une arme de base et doit survivre.
- Au fur et à mesure:
  - Les ennemis deviennent plus nombreux.
  - Des obstacles/planètes peuvent apparaître.
  - Le joueur gagne de l’XP, déclenche des level-up et choisit des améliorations.
  - Des “aides” (Rewards) et un **shop** apparaissent pour proposer des options (Weapons/Spells/Ship/Explosive/Ally).

### Qui est impliqué

- **Le joueur**: pilote le vaisseau, choisit des cartes, gère le positionnement.
- **Les ennemis**: cherchent le joueur et infligent des dégâts au contact.

### Pourquoi ces choix

- Donner un gameplay simple à prendre en main (tir auto), mais exigeant (survie/placement).
- Ajouter une forte variété visuelle (sprites, explosions, effets d’écran) et de progression (cartes).
- Stabiliser l’affichage au premier lancement (warmup) pour éviter les artefacts.

## Fonctionnalités principales (résumé)

### Visuels / Sprites

- Sprites joueur (différents véhicules)
- Sprites ennemis (types menace/miniboss/boss/snake)
- Explosion animée via des GIFs
- Bouclier généré dynamiquement (sprite programmatique)
- Laser: sprite affiché sur le **beam** (faisceau)

### Effets et feedback

- Effets plein écran pour certaines actions (freeze, explosive)
- Effets d’activation et effets persistants pour:
  - **Weapons** (Laser/Ion)
  - **Spells** (Shield/Chain Lightning)
  - **Ship buffs** (Interceptor/Bomber)
  - **Explosives** (Nuke/Mega Nuke)

### Audio

- SFX chargés depuis `assets/sound/*.mp3` et joués via WebAudio (fallback si indisponible)
- Musique de fond `assets/sound/soundtrack.mp3` en boucle, démarrée au premier clic/touche (politique autoplay navigateur)

## Difficultés rencontrées

### 1) Glitches d’affichage au premier lancement

- Symptôme: artefacts/couleurs qui “buggent” quelques secondes.
- Solution:
  - Écran de chargement dédié.
  - Phase de *warmup* au début (désactivation temporaire des effets lourds).
  - Forcer un fond opaque chaque frame pour éviter l’accumulation.

### 2) Différences entre projectile et beam (laser)

- Le “laser” était un **beam**, donc le code projectile ne s’appliquait pas.
- Solution:
  - Rendu du sprite laser directement dans `drawBeams()`.

### 3) Autoplay audio (musique)

- Les navigateurs bloquent la musique tant qu’il n’y a pas une interaction utilisateur.
- Solution:
  - Démarrage sur `pointerdown` / `keydown`.

### 4) Mini-map non visible

- La mini-map était dessinée trop rarement alors que le fond était redessiné chaque frame.
- Solution:
  - Dessiner la mini-map à chaque frame (ou la mettre en cache si besoin).

## Outils IA utilisés

### Outil

- Assistant IA dans l’IDE (pair-programming) pour:
  - Identifier les parties du code à modifier.
  - Proposer des approches de correction.
  - Générer des patches ciblés.
  - Aider à structurer les systèmes (assets, effets, UI, audio).

### Spécifications / règles d’usage

- Les modifications sont faites de façon ciblée, fichier par fichier.
- Ajout de mécanismes de *fallback* (si un sprite/son manque, rendu vectoriel/son simple).
- Les assets sont chargés depuis le dossier `assets/`.
- Respect des contraintes navigateur (autoplay, formats compatibles, performance).

### Exemples de prompts (utilisés / réutilisables)

- **Sprites**
  - « Charge les sprites depuis `assets/` et ajoute un fallback vectoriel si le fichier n’existe pas. »
  - « Intègre un sprite pour le laser et applique la rotation et le scaling selon la direction. »

- **Effets visuels**
  - « Ajoute une animation plein écran quand l’aide `freeze` est choisie. »
  - « Pour `Explosive`, je veux une animation différente par type et très visible. »

- **Debug / performance**
  - « Corrige les glitches d’affichage au premier lancement en ajoutant un warmup et en désactivant temporairement les effets lourds. »
  - « La mini-map ne s’affiche pas: trouve la cause et corrige. »

- **UI**
  - « Refaire l’interface menu/gameover/levelup avec un style sci-fi cohérent, sans changer la logique du jeu. »

- **Audio**
  - « J’ai ajouté des mp3 dans `assets/sound`, charge-les via WebAudio et branche-les aux événements du jeu. »

## Structure des dossiers (repère)

- `4-Game/` : jeu principal
  - `index.html` : page de lancement
  - `style.css` : styles UI
  - `sketch.js` : boucle principale + rendu + logique UI/effects
  - `assets/` : sprites, explosions, sons

