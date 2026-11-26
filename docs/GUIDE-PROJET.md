# Guide du mini-projet DevOps — Gestion des réclamations

Ce document est **le fil conducteur du projet** : il explique le besoin, l'application, la chaîne DevOps livrée, les étapes de réalisation et la façon de tout démontrer. Les détails techniques sont répartis dans les autres fichiers du dossier `docs/`.

---

## 1. Compréhension du besoin (sujet du PDF)

### Problème initial

Avant le projet, le fonctionnement décrit par l'enseignant était le suivant :

> les développeurs modifient le code, testent parfois manuellement, puis envoient les fichiers à la personne qui déploie.

Conséquences : erreurs humaines, différences entre environnements, retards, difficulté à revenir à une version stable.

### Objectif atteint

Transformer cette application web en un produit livré par une **chaîne automatisée, reproductible, sécurisée et observable** :

```text
Commit / Push / Pull Request
        ↓
CI (qualité + tests + sécurité)
        ↓
Build → artefact versionné → image Docker
        ↓
Registre GHCR
        ↓
Déploiement automatique en environnement de test
        ↓
Smoke tests + /health + /metrics
        ↓
Journaux / supervision
        ↓
Rollback si incident
```

La priorité du PDF est la **qualité de la chaîne**, pas le volume de code métier. L'application reste donc volontairement simple et stable.

---

## 2. L'application support

| Élément                 | Choix retenu                                               |
| ----------------------- | ---------------------------------------------------------- |
| Domaine                 | Gestion des réclamations (domaine proposé par le sujet)    |
| Backend / API           | Node.js 20 + Express 4, style CommonJS                     |
| Interface web           | Page statique minimale servie par Express (`public/`)      |
| Base de données         | PostgreSQL 16, schéma créé au démarrage (`src/db.js`)      |
| Authentification        | JWT (`jsonwebtoken`) + mots de passe hachés (`bcryptjs`)   |
| Fonctionnalité métier 1 | Créer et lister ses réclamations                           |
| Fonctionnalité métier 2 | Changer le statut : `ouverte` → `en_cours` → `resolue`     |
| Configuration           | Uniquement par variables d'environnement (`src/config.js`) |
| Observabilité           | Logs JSON sur stdout, sondes `/health` et `/metrics`       |

### Principales routes

| Méthode | Route                          | Rôle                                    |
| ------- | ------------------------------ | --------------------------------------- |
| GET     | `/`                            | Interface web                           |
| GET     | `/health`                      | Sonde de santé (base incluse) + version |
| GET     | `/metrics`                     | Indicateurs techniques                  |
| POST    | `/api/auth/register`           | Inscription                             |
| POST    | `/api/auth/login`              | Connexion → token JWT                   |
| POST    | `/api/reclamations`            | Créer une réclamation (authentifié)     |
| GET     | `/api/reclamations`            | Lister ses réclamations (authentifié)   |
| GET     | `/api/reclamations/:id`        | Détail (authentifié)                    |
| PATCH   | `/api/reclamations/:id/status` | Changer le statut (authentifié)         |

---

## 3. Architecture de la chaîne

```text
┌──────────────┐   push / PR   ┌────────────────┐   artefact   ┌───────────────┐
│ Dépôt GitHub ├──────────────►│ GitHub Actions ├─────────────►│ GHCR (image)  │
└──────────────┘               └───────┬────────┘              └───────┬───────┘
                                       │ jobs                        │ image tag sha
                     ┌─────────────────┼─────────────────┐            │
                     ▼                 ▼                 ▼            ▼
              qualité / tests    audit / secrets   build / Trivy   déploiement test
                     │                 │                 │            │
                     └────────────────►└────────────────►└───────────► smoke tests
                                                                        │
                                                                        ▼
                                                            logs + /health + /metrics
                                                                        │
                                                                        ▼
                                                           rollback (workflow dédié)
```

Environnements :

- **développement** : `npm start` ou `docker compose up --build` (port 3000) ;
- **test** : `docker compose -f docker-compose.test.yml` (port 3001), base séparée `reclamations_test`, image versionnée publiée ;
- la plateforme CI elle-même sert d'environnement de test éphémère : aucune infrastructure payante n'est nécessaire, ce qui est autorisé par le PDF.

---

## 4. Les 7 lots demandés — ce qui a été réalisé

| Lot du PDF                                    | Objectif                                                                                      | Réalisation concrète                                                                                                                                                                                                      | Fichiers / preuves                                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **1. Dépôt Git et collaboration**             | Dépôt distant structuré, branches, commits explicites, PR avec revue                          | Dépôt `nawre12/reclamations-devops`, branches `main`, `develop`, `feature/*`, `fix/*`, convention `type: message`, PRs déjà présentes (`feature/tests-quality-gate`, `feature/contributing-guide`, `feature/ci-pipeline`) | `CONTRIBUTING.md`, historique Git, `.github/`                                                            |
| **2. Intégration continue et build**          | Pipeline as code, déclencheurs push/PR, dépendances reproductibles, artefact versionné        | `ci.yml` déclenché sur push et PR ; `npm ci` avec cache npm ; artefact `reclamations-<sha>.tar.gz` téléchargeable                                                                                                         | `.github/workflows/ci.yml` (jobs 1, 2, 5)                                                                |
| **3. Qualité et tests**                       | Lint, analyse statique, tests unitaires, tests API, couverture, quality gate                  | ESLint + Prettier, Jest unitaire (statuts, métriques), Jest intégration (API + base de test séparée), seuil de couverture 70 % / 60 % / 70 % / 70 %, échec du pipeline si un test échoue                                  | `eslint.config.js`, `.prettierrc`, `tests/`, `package.json`                                              |
| **4. Conteneurisation et registre**           | Dockerfile, orchestration locale, ports/réseaux/volumes, image taggée et publiée              | Dockerfile multi-étapes non-root, `docker-compose.yml` (dév, volume persistant), `docker-compose.test.yml` (test, base éphémère), image `ghcr.io/<depot>:sha-<commit>` et tag de branche                                  | `Dockerfile`, `.dockerignore`, `docker-compose*.yml`, job 6 du pipeline                                  |
| **5. Configurations, secrets, DevSecOps**     | Séparation des environnements, aucun secret versionné, au moins un contrôle de sécurité       | Variables d'environnement partout, `.env.example` / `.env.test.example` sans secret réel, `npm audit --audit-level=high`, script de détection de secrets, Dependabot, scan Trivy de l'image, utilisateur non-root         | `docs/ENVIRONNEMENTS-SECRETS.md`, `docs/SECURITE.md`, `scripts/secret-scan.js`, `.github/dependabot.yml` |
| **6. Déploiement automatisé et vérification** | Environnement de test distinct, déploiement auto, smoke tests, health check, trace de version | Job `deploy-test` (approbation manuelle possible via l'environnement `test`), `scripts/deploy.js`, `scripts/smoke-test.js`, version vérifiée dans `/health` et `state/deployment.json`                                    | `.github/workflows/ci.yml` (job 7), `docs/DEPLOIEMENT.md`                                                |
| **7. Supervision, incident, rollback**        | Logs, indicateurs, incident simulé, rollback documenté et exécuté                             | Logs JSON, `/metrics`, guide de diagnostic, `scripts/incident-simulate.js`, `scripts/rollback.js`, workflow `rollback.yml` manuel                                                                                         | `docs/SUPERVISION-INCIDENT.md`, `docs/ROLLBACK.md`, `.github/workflows/rollback.yml`                     |

---

## 5. Planification indicative (12 semaines) — suivi

| Semaine | Travail attendu                           | État dans ce dépôt                                              |
| ------- | ----------------------------------------- | --------------------------------------------------------------- |
| 1       | Comprendre le flux, choisir l'application | Ce document, § 1 à 3                                            |
| 2       | Dépôt, branches, première PR              | `CONTRIBUTING.md`, branches et PRs visibles sur GitHub          |
| 3       | Pipeline minimal et déclencheurs          | `ci.yml` (push + pull_request + workflow_dispatch)              |
| 4       | Dépendances, build, artefact              | `npm ci`, job `build-artifact`                                  |
| 5       | Lint, analyse statique, tests unitaires   | Job `quality`, `unit-tests`, `tests/unit/`                      |
| 6       | Tests API, couverture, rapports           | Job `integration-tests`, `coverage/`, artefacts                 |
| 7       | Conteneurisation                          | `Dockerfile`, `docker-compose.yml`, `docker-compose.test.yml`   |
| 8       | Image publiée, configs et secrets         | Job `image` (GHCR), `docs/ENVIRONNEMENTS-SECRETS.md`            |
| 9       | Déploiement test et smoke tests           | Job `deploy-test`, `scripts/deploy.js`, `scripts/smoke-test.js` |
| 10      | DevSecOps et remédiation                  | Audit, secret-scan, Trivy, `docs/SECURITE.md`                   |
| 11      | Logs, supervision, incident               | `/metrics`, `docs/SUPERVISION-INCIDENT.md`                      |
| 12      | Chaîne complète, rollback, soutenance     | `docs/ROLLBACK.md`, `docs/SOUTENANCE.md`, `docs/BILAN.md`       |

---

## 6. Commandes utiles

### Vérification locale (sans Docker)

```bash
npm ci
npm run lint
npm run format:check
npm test                      # nécessite PostgreSQL sur localhost:5432
npm run verify                # lint + format + tests
```

Si PostgreSQL est déjà démarré avec les valeurs de `.env.example`, la base `reclamations_test` utilisée par les tests est suffisante.

### Avec Docker

```bash
cp .env.example .env          # puis renseigner JWT_SECRET
docker compose up --build     # développement : http://localhost:3000
docker compose down

# Environnement de test avec l'image publiée
set IMAGE=ghcr.io/<proprietaire>/<depot>:sha-<commit>
set JWT_SECRET=valeur-de-test
docker compose -p reclamations-test -f docker-compose.test.yml up -d
node scripts/smoke-test.js    # http://localhost:3001
```

### Chaîne complète

Pousser sur `develop` ou ouvrir une PR : le pipeline se déclenche automatiquement. Le déploiement en test se fait sur les push de `main`/`develop` ou via `workflow_dispatch` avec l'option `deploy_test`.

---

## 7. Démonstration finale (pas-à-pas)

Le scénario complet est détaillé dans `docs/SOUTENANCE.md`. En résumé :

1. présenter l'application (`/`) et l'organisation des branches ;
2. modifier une ligne (par exemple le titre de la page) et pousser sur `develop` ;
3. montrer les jobs du pipeline dans l'onglet **Actions** ;
4. montrer un test qui s'exécute et le rapport de couverture (artefact) ;
5. montrer l'image dans **Packages** (GHCR) et son tag `sha-...` ;
6. montrer le déploiement test, `/health`, `/metrics` et les smoke tests ;
7. expliquer l'audit, le secret-scan et le scan Trivy ;
8. simuler un incident (arrêt de la base), lire les logs, puis lancer le rollback.

---

## 8. Correspondance avec les 15 livrables obligatoires

| #   | Livrable demandé                                | Où le trouver                                                 |
| --- | ----------------------------------------------- | ------------------------------------------------------------- |
| 1   | Dépôt Git complet                               | `https://github.com/nawre12/reclamations-devops`              |
| 2   | Présentation de l'application et architecture   | Ce document, § 2 et 3                                         |
| 3   | Stratégie de branches et règles de contribution | `CONTRIBUTING.md`                                             |
| 4   | Fichiers de pipeline CI/CD                      | `.github/workflows/ci.yml`, `.github/workflows/rollback.yml`  |
| 5   | Scripts et fichiers de dépendances              | `scripts/`, `package.json`, `package-lock.json`               |
| 6   | Conteneurisation et orchestration locale        | `Dockerfile`, `docker-compose.yml`, `docker-compose.test.yml` |
| 7   | Suites de tests et rapports                     | `tests/`, artefact `couverture-<sha>`                         |
| 8   | Analyses qualité et sécurité                    | Jobs `quality`/`security`/Trivy, `docs/SECURITE.md`           |
| 9   | Matrice environnements/configurations/secrets   | `docs/ENVIRONNEMENTS-SECRETS.md`                              |
| 10  | Preuve de publication de l'image                | Artifact `image-<sha>`, onglet Packages GHCR                  |
| 11  | Procédure de déploiement + smoke tests          | `docs/DEPLOIEMENT.md`, `state/smoke-result.json` en CI        |
| 12  | Procédure de rollback                           | `docs/ROLLBACK.md`, `rollback.yml`                            |
| 13  | Supervision, logs, fiche d'incident             | `docs/SUPERVISION-INCIDENT.md`                                |
| 14  | Bilan difficultés / améliorations               | `docs/BILAN.md`                                               |
| 15  | Présentation synthétique                        | `docs/SOUTENANCE.md`                                          |

---

## 9. Points à configurer côté GitHub (5 minutes)

1. **Secrets** : créer `JWT_SECRET_TEST` si l'on veut un secret maîtrisé ; à défaut, le pipeline génère une valeur par exécution pour l'environnement de test éphémère.
2. **Environnement `test`** : _Settings → Environments → New environment_ ; ajouter un reviewer si l'on veut l'approbation manuelle avant déploiement.
3. **Branche `main` protégée** : exiger une PR et le passage des jobs `quality`, `unit-tests`, `integration-tests`, `security`.
4. **GHCR** : laisser les permissions `packages: write` du job `image` (déjà dans `ci.yml`) ; aucune action supplémentaire n'est nécessaire avec un dépôt public.
5. **Fiche de remise** : compléter les nom/prénom et la date dans `docs/REMISE.md`.

Les limites et choix techniques sont explicités dans `docs/BILAN.md` : aucun Kubernetes, aucun cloud payant, et aucune étape non réalisée n'est présentée comme opérationnelle.
