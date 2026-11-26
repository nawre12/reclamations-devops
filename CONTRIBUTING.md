# Guide de contribution

## Stratégie de branches

- `main` : version stable et déployable. Aucun push direct, uniquement par Pull Request.
- `develop` : branche d'intégration.
- `feature/<nom>` : une branche par fonctionnalité ou modification, créée depuis `develop`.
- `fix/<nom>` : correction de bug.

## Convention de commits

Format : `type: description courte`

| Type  | Usage                          |
| ----- | ------------------------------ |
| feat  | nouvelle fonctionnalité        |
| fix   | correction de bug              |
| ci    | pipeline CI/CD                 |
| docs  | documentation                  |
| test  | ajout ou modification de tests |
| chore | maintenance, configuration     |

Exemple : `feat: ajout de l'endpoint de suppression`

## Workflow

1. `git checkout develop && git pull`
2. `git checkout -b feature/ma-fonctionnalite`
3. Développer, puis vérifier en local : `npm run lint`, `npm run format:check`, `npm test`
4. Pousser la branche et ouvrir une Pull Request vers `develop`.
5. Au moins une revue est requise avant la fusion.
6. La fusion `develop` vers `main` se fait par Pull Request après validation du pipeline.

## Règles

- Ne jamais versionner de secrets (mots de passe, tokens, fichier `.env`).
- Le pipeline doit être vert avant toute fusion.
