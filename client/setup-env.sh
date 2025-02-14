#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages d'erreur
error() {
    echo -e "${RED}[ERREUR]${NC} $1"
    exit 1
}

# Fonction pour afficher les messages de succès
success() {
    echo -e "${GREEN}[SUCCÈS]${NC} $1"
}

# Fonction pour afficher les messages d'information
info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Fonction pour afficher les messages de débogage
debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Vérifier si le script est exécuté avec sudo
if [ "$EUID" -eq 0 ]; then
    error "Ne pas exécuter ce script avec sudo. Il demandera les permissions si nécessaire."
fi

# Fonction pour vérifier une commande
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "Commande '$1' non trouvée. Veuillez l'installer d'abord."
    fi
}

# Vérification des commandes requises
info "Vérification des prérequis..."
check_command curl
check_command git

# Mise à jour du système
info "Mise à jour du système..."
sudo apt update && sudo apt upgrade -y || error "Impossible de mettre à jour le système"
sudo apt install -y curl git build-essential python3 python3-pip || error "Impossible d'installer les outils requis"

# Installation de NVM
info "Installation de NVM..."
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash || error "Impossible d'installer NVM"
fi

# Charger NVM
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Vérifier si NVM est installé
if ! command -v nvm &> /dev/null; then
    error "NVM n'est pas installé correctement. Veuillez redémarrer votre terminal et réessayer."
fi

# Installation de Node.js v22.13.1 (version exacte de l'utilisateur)
info "Installation de Node.js v22.13.1..."
nvm install 22.13.1 || error "Impossible d'installer Node.js"
nvm use 22.13.1 || error "Impossible d'utiliser Node.js v22.13.1"
nvm alias default 22.13.1 || error "Impossible de définir Node.js v22.13.1 comme version par défaut"

# Vérifier les versions de Node.js et npm
node_version=$(node -v)
npm_version=$(npm -v)
info "Node.js version: $node_version"
info "npm version: $npm_version"

if [ "$node_version" != "v22.13.1" ]; then
    error "La version de Node.js n'est pas correcte. Attendu: v22.13.1, Obtenu: $node_version"
fi

# Installation de node-gyp globalement (requis pour certaines dépendances)
info "Installation de node-gyp..."
npm install -g node-gyp || error "Impossible d'installer node-gyp"

# Désinstallation des versions précédentes des CLI
info "Nettoyage des installations précédentes..."
npm uninstall -g @angular/cli @nestjs/cli || true
npm cache clean --force
npm cache verify

# Installation des CLI globaux avec les versions exactes
info "Installation des CLI globaux..."
npm install -g @angular/cli@19.1.5 || error "Impossible d'installer Angular CLI"
npm install -g @nestjs/cli@11.0.2 || error "Impossible d'installer NestJS CLI"

# Vérifier la version d'Angular CLI
ng_version=$(ng version | grep "@angular/cli")
info "Angular CLI version: $ng_version"

# Navigation vers le répertoire du projet
PROJECT_DIR="$HOME/INF3995-102/client"
cd "$PROJECT_DIR" || error "Impossible de trouver le répertoire du projet"

# Nettoyage complet
info "Nettoyage de l'environnement..."
debug "Suppression des dossiers node_modules, dist, .angular et package-lock.json"
rm -rf node_modules dist .angular package-lock.json
npm cache clean --force

# Fix pour les permissions npm
info "Configuration des permissions npm..."
mkdir -p "$HOME/.npm"
sudo chown -R $(whoami) "$HOME/.npm"

# Installation des dépendances
info "Installation des dépendances du projet..."
npm ci || {
    debug "npm ci a échoué, tentative avec npm install..."
    npm install || error "Impossible d'installer les dépendances"
}

# Vérification des dépendances critiques
info "Vérification des dépendances critiques..."
if [ ! -d "node_modules/@angular/material" ]; then
    debug "Installation explicite de @angular/material..."
    npm install @angular/material || error "Impossible d'installer @angular/material"
fi

if [ ! -d "node_modules/@angular/cdk" ]; then
    debug "Installation explicite de @angular/cdk..."
    npm install @angular/cdk || error "Impossible d'installer @angular/cdk"
fi

# Construction du projet
info "Construction du projet..."
ng build || error "Impossible de construire le projet"

# Configuration des permissions
info "Configuration des permissions..."
chmod +x setup-angular.sh || true

success "Configuration de l'environnement terminée avec succès!"
success "Votre environnement est maintenant identique à celui de l'utilisateur original"
info "Les packages suivants ont été installés globalement:"
info "- Node.js v22.13.1"
info "- npm v10.9.2"
info "- @angular/cli v19.1.5"
info "- @nestjs/cli v11.0.2"
info "- node-gyp"
echo ""
info "Pour démarrer l'application:"
echo "1. cd $PROJECT_DIR"
echo "2. ng serve"