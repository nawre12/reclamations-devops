# Pipeline CI/CD — explication détaillée

Fichier source : `.github/workflows/ci.yml`. Le pipeline est écrit **as code**, versionné, lisible et commenté. Chaque job ci-dessous précise ses entrées, sorties et conditions de réussite.

## 1. Déclencheurs et portée

| Événement           | Branches                                  | Effet                                                                                |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `push`              | `main`, `develop`, `feature/**`, `fix/**` | Chaîne complète ; publication de l'image ; déploiement en test pour `main`/`develop` |
| `pull_request`      | `main`, `develop`                         | Qualité, tests, sécurité, build et image **sans publication**                        |
| `workflow_dispatch` | manuel                                    | Option `deploy_test` pour forcer le déploiement                                      |

Une `concurrency` annule les exécutions redondantes sur la même référence. Les permissions sont minimales : `contents: read` partout, `packages: write` uniquement pour le job qui publie l'image.

## 2. Graphe des jobs

```text
quality ─────┐
unit-tests ──┼──► build-artifact ───► image ───► deploy-test
integration-┤
security ───┘
```

`needs` garantit qu'aucun artefact n'est produit tant que la qualité, les tests et la sécurité ne sont pas verts. Le déploiement dépend de la publication de l'image.

## 3. Détail des jobs

### Job 1 — `quality` : formatage et analyse statique

- **Entrées** : code source versionné, `package-lock.json`.
- **Actions** : `npm ci` (installation reproductible), `npm run format:check` (Prettier), `npm run lint` (ESLint avec règles recommandées).
- **Sorties** : logs d'exécution, aucun artefact.
- **Réussite** : aucun fichier mal formaté, aucune erreur ESLint.
- **Échec typique** : indentation, guillemets, variable non définie, `console.log` interdit par la configuration.

### Job 2 — `unit-tests` : tests unitaires

- **Entrées** : `tests/unit/status.test.js`, `tests/unit/metrics.test.js`, modules `src/status.js` et `src/metrics.js`.
- **Actions** : `npm ci`, `npm run test:unit`.
- **Sorties** : résultat Jest dans les logs.
- **Réussite** : tous les tests passent, sans base de données nécessaire.

### Job 3 — `integration-tests` : tests API et couverture

- **Entrées** : service `postgres:16-alpine` avec la base `reclamations_test`, identifiants de test, `DATABASE_URL` et un `JWT_SECRET` généré pour l'exécution.
- **Actions** : `npm ci`, `npm run test:integration:coverage`.
- **Sorties** : artefact `couverture-<sha>` contenant `lcov.info` et le rapport HTML.
- **Quality gate** : seuils définis dans `package.json` (énoncés, branches, fonctions, lignes). Un test API en échec ou une couverture insuffisante fait échouer le job.
- **Base séparée** : les tests ne touchent jamais la base de développement.

### Job 4 — `security` : dépendances et secrets

- **Entrées** : `package-lock.json`, fichiers suivis par Git.
- **Actions** : `npm run security:audit` (`npm audit --audit-level=high`), `npm run security:secrets` (script local de détection).
- **Sorties** : rapports JSON dans les logs.
- **Réussite** : aucune vulnérabilité de niveau high/critical, aucun secret détecté.
- **Voir aussi** : `docs/SECURITE.md` et `.github/dependabot.yml`.

### Job 5 — `build-artifact` : artefact versionné

- **Entrées** : dépendances de production uniquement (`npm ci --omit=dev`).
- **Actions** : création d'une archive `reclamations-<sha>.tar.gz` contenant `package.json`, le lockfile, `src/`, `public/` et `node_modules/` de production ; écriture de `VERSION.txt`.
- **Sorties** : artefact GitHub `artefact-<sha>` (rétention 14 jours, téléchargeable depuis l'exécution).
- **Réussite** : archive produite et téléversée. Le nom de l'artefact contient le SHA du commit : la version est identifiable.

### Job 6 — `image` : construction, scan et publication

- **Entrées** : `Dockerfile`, `.dockerignore`, sources, artefact validé en amont.
- **Actions** :
  1. `docker/build-push-action` construit l'image `reclamations:ci-<sha>` et la charge localement (cache GitHub Actions) ;
  2. Trivy scanne les vulnérabilités `CRITICAL,HIGH` non corrigées (`exit-code: 1`, rapport archivé même en échec) ;
  3. sur `push`, connexion à GHCR avec `GITHUB_TOKEN` puis publication de deux tags : `:sha-<commit>` (immuable) et `:<branche>` (traçable, `/` remplacé par `-`) ;
  4. le tag publié est archivé dans `image-<sha>`.
- **Sorties** : image dans GHCR, rapport Trivy, référence de l'image.
- **Réussite** : scan sans alerte bloquante et `docker push` effectué.
- **Sur une PR** : l'image est construite et scannée mais **non publiée** (pas de droits d'écriture accordés aux PR externes).

### Job 7 — `deploy-test` : déploiement et vérification

- **Condition** : push sur `main`/`develop` ou lancement manuel avec `deploy_test=true`.
- **Environnement** : `test` (protection et approbation manuelle configurables dans les paramètres du dépôt).
- **Entrées** : image `ghcr.io/<depot>:sha-<commit>`, `APP_VERSION`, `JWT_SECRET` (secret du dépôt ou valeur générée par exécution).
- **Actions** :
  1. nettoyage de l'environnement (`docker compose down -v`) ;
  2. `node scripts/deploy.js` : `docker compose pull`, `up -d`, attente des smoke tests ;
  3. smoke tests : `/health`, `/`, `/metrics`, inscription, connexion, création, lecture et transitions de statut ;
  4. collecte des logs et de `state/deployment.json` comme preuves.
- **Sorties** : artefact `preuves-deploiement-<sha>` (logs, état de déploiement, résultat des smoke tests).
- **Réussite** : HTTP 200 sur les sondes et réussite de toute la séquence métier ; la version renvoyée par `/health` doit être celle du commit.
- **Trace de version** : `/health.version`, `APP_VERSION` dans le conteneur et `state/deployment.json`.

## 4. Quality gates récapitulés

| Gate                   | Bloque quoi ?          | Condition                                    |
| ---------------------- | ---------------------- | -------------------------------------------- |
| Format + lint          | Tout le reste          | Prettier et ESLint sans erreur               |
| Tests unitaires        | Artefact               | 100 % des tests unitaires verts              |
| Tests API + couverture | Artefact               | Tests verts et seuils de couverture atteints |
| Audit + secrets        | Artefact               | Aucune vulnérabilité élevée, aucun secret    |
| Trivy                  | Publication de l'image | Aucune alerte CRITICAL/HIGH non corrigée     |
| Smoke tests            | Fin du déploiement     | Application fonctionnelle après démarrage    |

## 5. Lire et exploiter le pipeline

1. Onglet **Actions** du dépôt → ouvrir la dernière exécution.
2. Chaque job affiche ses étapes et la durée : utile pour la durée moyenne du pipeline.
3. Télécharger les artefacts en bas de page : couverture, rapport Trivy, preuves de déploiement.
4. Le taux de réussite se lit sur l'historique des exécutions (indicateur demandé dans le § 13 du PDF).
5. En cas d'échec, les logs ne sont pas masqués : la cause est visible dans l'étape concernée, puis corrigée par un nouveau commit.
