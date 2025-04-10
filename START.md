
# INF3995-102 - Guide d'installation et de lancement

Ce document explique comment installer et lancer localement ou via Docker l’ensemble des composants du projet INF3995-102, incluant :

- Une simulation ROS 2 à l'aide de Gazebo
- Un serveur NestJS connecté à MongoDB
- Une interface utilisateur Angular

Ce fichier **ne contient pas la documentation fonctionnelle ou technique du projet**. Pour cela, référez-vous à `README.md` ou `RR_équipe102.pdf`.

---

## 🐳 LANCEMENT AVEC DOCKER

> Ce mode permet de tout lancer automatiquement dans un environnement isolé et reproductible.

### 🔧 Prérequis

- Avoir Docker installé : [https://docs.docker.com/get-docker](https://docs.docker.com/get-docker)
- Docker Compose (si utilisé pour étendre le projet)

### ▶️ Lancement

```bash
docker compose -f docker-compose.yml up --build
```

> Cela démarre automatiquement :
> - la simulation Gazebo et ROS
> - le serveur NestJS
> - MongoDB
> - le client Angular sur `localhost:4200`

---

## 🛠️ LANCEMENT MANUEL (SANS ENVIRONNEMENT VIRTUEL)

> Ce mode est utile pour le développement local ou en cas de besoin de contrôle plus précis.

---

### 🔧 Étape 1 : Installer les dépendances

Lancer le script d’installation une seule fois pour configurer l’environnement :

```bash
./start_install.sh
```

Ce script installe automatiquement :

- ROS 2 Humble
- Ignition Gazebo Fortress
- Node.js 20 via NVM
- Angular CLI / NestJS CLI
- MongoDB
- Toutes les dépendances nécessaires pour ROS, Python, Node.js, etc.

> Si jamais des problèmes surviennent lors de l'installation, essayer des lancer les configurations d'installations individuelles se situant dans leurs dossier respectifs (/robot, /server, /client)

---

### 🎮 Étape 2 : Choisir un mode de lancement

---

#### 🚀 LANCEMENT COMPLET DE LA SIMULATION (Gazebo + client + serveur + MongoDB)

```bash
./start_gazebo.sh
```

> Ce script lance :
> - La simulation ROS 2 dans Gazebo
> - Le serveur NestJS
> - La base de données MongoDB
> - Le client Angular sur `http://localhost:4200`

---

#### 💻 LANCEMENT DE LA STATION AU SOL UNIQUEMENT (client + serveur + MongoDB)

```bash
./start_base.sh
```

> Ce mode est utlisé quand la mission est lancé avec les robots LIMO.

---

## 📁 STRUCTURE DU PROJET

```
INF3995-102/
├── client/                 → Interface Angular
├── server/                 → Serveur Nestjs
├── robot/                  → Code ROS2, LIMO et Gazebo
├── start_install.sh        → Installation des dépendances (à lancer une seule fois)
├── start_base.sh           → Lancement station au sol (serveur + client + MongoDB)
├── start_gazebo.sh         → Lancement complet (simulation + serveur + client + MongoDB)
├── start_docker.sh         → Lancement via Docker
├── Dockerfile              → Dockerfile principal
├── docker-compose.yml      → Utilisé pour construire le conteneur
```

---

## 🔢 INFORMATIONS TECHNIQUES

- **ROS_DOMAIN_ID** utilisé : `102`
- ROS 2 version : `Ros2 Humble pour Ubuntu 22.04 obligatoire`
- MongoDB démarre sur le port `27017`
- Le client Angular est accessible sur le port `4200`
- Le serveur NestJS tourne sur le port `3000`