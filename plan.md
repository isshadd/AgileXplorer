# Plan d'adaptation du frontend pour deux robots

## 1. Modification du RobotService

### Changements nécessaires :
- Ajouter le `robotId` dans les paramètres des méthodes
- Modifier les URLs des endpoints pour inclure l'ID du robot

## 2. Modification du DashboardComponent

### Changements nécessaires :
- Créer une interface pour représenter l'état d'un robot
- Maintenir un état séparé pour chaque robot
- Adapter le template pour afficher les contrôles de chaque robot
- Modifier les méthodes pour spécifier quel robot est contrôlé

## 3. Tests et Validation

- Vérifier que chaque robot peut être contrôlé indépendamment
- S'assurer que les états sont correctement mis à jour pour chaque robot
- Valider que les requêtes HTTP sont correctement formées avec les IDs des robots

## Plan d'implémentation détaillé

1. Créer une nouvelle interface `RobotState` dans le dossier `interfaces`
2. Modifier le `robot.service.ts` pour inclure l'ID du robot dans les requêtes
3. Adapter le `dashboard.component.ts` pour gérer deux états de robot distincts
4. Mettre à jour le template du dashboard pour afficher deux sections distinctes
5. Tester que chaque robot peut être contrôlé indépendamment

Cette approche permettra d'avoir une interface claire et intuitive pour contrôler deux robots séparément tout en maintenant la cohérence avec l'architecture backend existante.