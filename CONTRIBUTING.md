# Guide de contribution

## Stratégie de branches

- `main` : version stable et déployable. Aucun push direct, uniquement par Pull Request.
- `develop` : branche d'intégration ; le pipeline y est exécuté à chaque push.
- `feature/<nom>` : une branche par fonctionnalité ou modification, créée depuis `develop`.
- `fix/<nom>` : correction de bug, créée depuis `develop` (ou `main` pour un hotfix).

Le déploiement en environnement de test se fait sur les push de `main` et `develop`. Les autres branches construisent et testent sans publier ni déployer.

## Convention de commits

Format : `type: description courte`

| Type    | Usage                                   |
| ------- | --------------------------------------- |
| `feat`  | nouvelle fonctionnalité                 |
| `fix`   | correction de bug                       |
| `ci`    | pipeline CI/CD                          |
| `docs`  | documentation                           |
| `test`  | ajout ou modification de tests          |
| `chore` | maintenance, configuration, dépendances |

Exemples : `feat: ajout de l'endpoint de suppression`, `ci: ajout du scan Trivy`, `test: couverture des transitions de statut`.

## Workflow

1. `git checkout develop && git pull`
2. `git checkout -b feature/ma-fonctionnalite`
3. Développer, puis vérifier en local : `npm run lint`, `npm run format:check`, `npm test` (ou `npm run verify` pour tout enchaîner).
4. Pousser la branche et ouvrir une Pull Request vers `develop`.
5. Au moins une revue est requise avant la fusion. Le pipeline doit être vert.
6. La fusion `develop` → `main` se fait également par Pull Request, après validation complète.

## Checklist avant ouverture d'une PR

- [ ] `npm run verify` passe en local ;
- [ ] les nouveaux comportements ont un test unitaire ou API ;
- [ ] aucune valeur sensible n'est ajoutée au dépôt ;
- [ ] la documentation concernée est mise à jour (`README.md` ou `docs/`) ;
- [ ] le titre de la PR décrit l'effet attendu et référence le lot du projet si besoin.

## Règles

- Ne jamais versionner de secrets (mots de passe, jetons, fichier `.env`) ni de fichiers temporaires (`state/`, `coverage/`, `node_modules/`).
- Le pipeline doit être vert avant toute fusion ; une erreur n'est pas masquée, elle est expliquée et corrigée.
- Les noms de jobs, variables et fichiers doivent rester explicites ; commenter la configuration lorsque nécessaire.
- Toute étape non réalisée doit être signalée dans `docs/BILAN.md`.
- Protection recommandée pour `main` : exiger une PR, au moins une approbation et le passage des jobs `quality`, `unit-tests`, `integration-tests` et `security`.
