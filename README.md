# Gestion des réclamations — mini-projet DevOps

API web Node.js/Express + PostgreSQL servant de support à une **chaîne DevOps complète** : CI, tests, qualité, sécurité, conteneurisation, publication d'image, déploiement en test, supervision et rollback.

🟢 **Pour comprendre en 1 page** : [`docs/EXPLICATION-SIMPLE.md`](docs/EXPLICATION-SIMPLE.md).

📘 **Document principal** : [`docs/GUIDE-PROJET.md`](docs/GUIDE-PROJET.md) — compréhension du projet, architecture, 7 lots et correspondance avec les 15 livrables du PDF.

🎬 **Démonstration** : [`docs/SCENARIO-DEMO.md`](docs/SCENARIO-DEMO.md) — scénario prêt à suivre quand le professeur demande « faites une modification et montrez-moi ».

## Démarrage rapide

### Sans Docker (PostgreSQL local)

```bash
cp .env.example .env        # renseigner JWT_SECRET
npm ci
npm start                   # http://localhost:3000
```

### Avec Docker

```bash
cp .env.example .env        # renseigner JWT_SECRET
docker compose up --build   # API + PostgreSQL, http://localhost:3000
```

### Vérifications

```bash
npm run verify              # lint + format + tests unitaires/API + couverture
npm run test:smoke          # smoke tests contre SMOKE_BASE_URL (défaut : localhost:3000)
npm run security:audit      # audit npm
npm run security:secrets    # détection de secrets versionnés
```

## Endpoints

| Méthode | Route                          | Description                             |
| ------- | ------------------------------ | --------------------------------------- |
| GET     | `/`                            | Interface web minimale                  |
| GET     | `/health`                      | Sonde de santé (base incluse) + version |
| GET     | `/metrics`                     | Indicateurs : requêtes, erreurs, durée  |
| POST    | `/api/auth/register`           | Inscription `{email, password}`         |
| POST    | `/api/auth/login`              | Connexion → `{token}`                   |
| POST    | `/api/reclamations`            | Créer `{title, description}` (auth)     |
| GET     | `/api/reclamations`            | Lister mes réclamations (auth)          |
| GET     | `/api/reclamations/:id`        | Détail (auth)                           |
| PATCH   | `/api/reclamations/:id/status` | `ouverte → en_cours → resolue` (auth)   |

## Structure du dépôt

```text
.github/workflows/   pipelines CI/CD (ci.yml, rollback.yml)
docs/                guide du projet et toutes les procédures
public/              interface web statique
scripts/             smoke tests, déploiement, rollback, incident, sécurité
src/                 application Express (app, auth, db, config, metrics, logger)
tests/               tests unitaires et d'intégration API
Dockerfile           image de production non-root
docker-compose*.yml  orchestration développement et test
```

## Chaîne DevOps

```text
push / PR → CI (format, lint, tests, sécurité) → artefact → image GHCR
         → déploiement test → smoke tests + health + metrics → logs → rollback
```

Détails : [`docs/PIPELINE.md`](docs/PIPELINE.md), [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md), [`docs/SUPERVISION-INCIDENT.md`](docs/SUPERVISION-INCIDENT.md), [`docs/ROLLBACK.md`](docs/ROLLBACK.md).

## Sécurité

Aucun secret réel n'est versionné. La configuration passe par des variables d'environnement (`src/config.js`) ; voir [`docs/ENVIRONNEMENTS-SECRETS.md`](docs/ENVIRONNEMENTS-SECRETS.md) et [`docs/SECURITE.md`](docs/SECURITE.md).

## Contribution

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour les branches, les conventions de commits et la checklist de Pull Request.
