# 🤖 Système d'exploration multi-robot

## Sommaire du projet

Ce projet, réalisé dans le cadre du cours INF3995 à Polytechnique Montréal, vise à concevoir un système complet d'exploration autonome multi-robot. Inspiré d'un contexte spatial, il simule une mission d'exploration de terrain avec deux robots AgileX Limo. Le système est divisé en trois parties principales :

- **Robots physiques**: logiciel ROS 2 Humble
- **Station au sol**: serveur NestJS, base de données MongoDB, interface Angular
- **Simulation**: Gazebo Fortress pour tester sans les robots physiques

L'opérateur interagit via une interface web unifiée pour démarrer, superviser et arrêter les missions. Toutes les composantes, sauf le code embarqué, sont conteneurisées avec Docker.

## 🌟 Fonctionnalités du robot

- Démarrage/arrêt de mission depuis l'interface web
- Navigation autonome avec évitement d'obstacles
- Cartographie 2D en temps réel visible sur l'interface
- Sauvegarde des missions en base de données (PostgreSQL)
- Communication directe inter-robots (P2P)

## 🗂️ Structure du projet

```
.
├── client/                     # Interface utilisateur Angular
├── server/                     # Serveur NestJS + PostgreSQL
├── robot/
│   ├── common/                 # Fichiers partagés entre robots (son, images, ...)
│   ├── gazebo/                 # Modèles et monde Gazebo
│   ├── gazebo_launch_scripts/  # Scripts pour le lancement séparé de la simulation
│   ├── limo/                   # Code spécifique au robot Limo
│   ├── limo_launch_scripts/    # Scripts pour le lancement séparé des limos
│   ├── robot/                  # Comportement embarqué des robots (navigation, communication, identification, ...)
│   ├── robot_launch_scripts/   # Scripts pour le lancement séparé de comportement embarqué
│   └── utilities/              # Scripts d'installation, débogage
├── docker-compose.yml          # Lancement station avec Docker
├── Dockerfile                  # Construction du conteneur
├── start_base.sh               # Script de démarrage de la station au sol (Fronend, Backend)
├── start_docker.sh             # Lance l'environnement complet avec Docker
├── start_gazebo.sh             # Lance simulation Gazebo (Frontend, Backend, Gazebo)
├── start_install.sh            # Installe dépendances nécéssaires
├── START.md                    # Instructions d’utilisation (voir ci-dessous)
```

## 📸 Images du projet

### Interface Web
![frontend](robot/common/readme_img_front.png)

### Gérération de map
![map](robot/common/readme_img_map.png)

### Base de donnée
![databse](robot/common/readme_img_database.png)

### Simulation Gazebo
![Gazebo](robot/common/readme_img_gazebo.png)

## ⚙️ Installation et exécution
Veuillez consulter le fichier `START.md` à la racine du projet. Celui-ci contient :

- Prérequis pour Ubuntu 22.04 (ou WSL2)
- Commandes pour lancer le projet avec `docker-compose`
- Instructions pour un lancement local (hors Docker)
- Détails pour lancer la simulation Gazebo avec ou sans robots

Lien rapide : [START.md](./START.md)

## 👥 Équipe 102
Zerouali, Amine  
Gratton Fournier, Kevin Santiago  
Haddadi, Issam  
Hachemi Boumila, Rafik  
Abassi, Yassine Mohamed Taha  
Milord, Mario Junior
   
## 🛠️ Technologies utilisés

<img  align="left" width="50" src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/gitlab.png" alt="Ros 2" title="Ros 2"/>
<img  align="left" width="50" src="https://user-images.githubusercontent.com/25181517/183890595-779a7e64-3f43-4634-bad2-eceef4e80268.png" alt="Angular" title="Angular"/>
<img  align="left" width="50" src="https://user-images.githubusercontent.com/25181517/192158954-f88b5814-d510-4564-b285-dff7d6400dad.png" alt="HTML" title="HTML"/>
<img align="left"  width="50" src="https://user-images.githubusercontent.com/25181517/183898674-75a4a1b1-f960-4ea9-abcb-637170a00a75.png" alt="CSS" title="CSS"/>
<img  align="left" width="50" src="https://user-images.githubusercontent.com/25181517/183890598-19a0ac2d-e88a-4005-a8df-1ee36782fde1.png" alt="TypeScript" title="TypeScript"/>
<img align="left"  width="50" src="https://user-images.githubusercontent.com/25181517/183423507-c056a6f9-1ba8-4312-a350-19bcbc5a8697.png" alt="Python" title="Python"/>
<img  align="left" width="50" src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/mongodb.png" alt="Ros 2" title="Ros 2"/>
<img  align="left" width="50" src="https://raw.githubusercontent.com/marwin1991/profile-technology-icons/refs/heads/main/icons/linux.png" alt="Ros 2" title="Ros 2"/>