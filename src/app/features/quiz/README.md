# Quiz Module Integration

Ce module ajoute une route lazy `quiz/:moduleId` avec une UX Archer-style pour les quiz NCLEX.

## Fichiers principaux

- `quiz.routes.ts` : route lazy du module
- `services/quiz-state.service.ts` : état du quiz via Angular Signals
- `services/quiz-data.service.ts` : chargement et validation du JSON
- `services/quiz-timer.service.ts` : timer global + timer par question
- `components/*` : écrans et panneaux UI
- `src/assets/data/shock-questions.json` : dataset initial `shock`

## Intégration

1. Vérifier que `provideHttpClient()` est déjà actif dans `app.config.ts`.
2. Garder la route ajoutée dans `app.routes.ts` : `quiz/:moduleId`.
3. Déposer d'autres datasets sous `src/assets/data/<moduleId>-questions.json`.
4. Naviguer vers `/quiz/shock` pour le module fourni.

## Contrats de données

- Chaque question doit avoir exactement 4 options.
- `correct` doit être un entier entre 0 et 3.
- Les champs HTML (`stem`, `rationale`, `distractors`, `additional`) sont rendus via `innerHTML` Angular.
