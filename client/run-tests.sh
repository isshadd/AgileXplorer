#!/bin/bash

# Trouver le chemin de l'exécutable Chrome/Chromium
CHROME_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null || which chrome 2>/dev/null || echo "/snap/bin/chromium")

# Afficher le chemin trouvé
echo "Utilisation de Chrome/Chromium à : $CHROME_PATH"

# Exporter la variable d'environnement CHROME_BIN
export CHROME_BIN="$CHROME_PATH"

# Lancer les tests avec Karma
echo "Lancement des tests avec Karma..."
npx ng test "$@"