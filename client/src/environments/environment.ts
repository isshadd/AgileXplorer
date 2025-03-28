export const environment = {
    production: false,
    // Utilise l'adresse IP/hostname actuel au lieu d'une adresse codée en dur
    // Cela permet à l'application de fonctionner sur différents appareils sans modification
    apiUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : `http://${window.location.hostname}:3000`
};