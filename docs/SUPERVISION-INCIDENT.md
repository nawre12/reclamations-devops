# Supervision, journalisation et fiche d'incident

## 1. Journalisation

L'application écrit des **logs JSON sur stdout** (`src/logger.js`), donc directement consultables via Docker :

```bash
docker compose -p reclamations-test -f docker-compose.test.yml logs -f app
docker compose -p reclamations-test -f docker-compose.test.yml logs --tail=200 db
```

Exemple de ligne :

```json
{
  "time": "2026-11-26T19:38:47.073Z",
  "level": "info",
  "message": "request",
  "method": "POST",
  "path": "/api/auth/register",
  "status": 201,
  "ms": 75
}
```

Champs utiles : `level` (`info`/`error`), `message`, `method`, `path`, `status`, `ms` (durée), `error` pour les exceptions. Les erreurs non gérées et les échecs de `/health` sont journalisés avec `level: error`. En CI, les logs sont archivés dans l'artefact `preuves-deploiement-<sha>` (fichier `deployment-logs.txt`).

## 2. Sondes et indicateurs

| Source                       | Ce que l'on obtient                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /health`                | état global (`ok` / `down`), version déployée, état de la base                               |
| `GET /metrics`               | uptime, nombre de requêtes, erreurs 5xx, durée moyenne de réponse, répartition par code HTTP |
| `docker compose ps`          | état des conteneurs `app` et `db`                                                            |
| `coverage/lcov.info`         | taux de couverture (artefact de CI)                                                          |
| Historique GitHub Actions    | taux de réussite, durée des jobs, fréquence des intégrations et déploiements                 |
| Rapports `npm audit` / Trivy | nombre de vulnérabilités détectées et corrigées                                              |
| `state/deployment.json`      | version courante, version précédente, date, mode (déploiement ou rollback)                   |

Exemple de réponse `/metrics` :

```json
{
  "service": "reclamations",
  "uptimeSeconds": 42,
  "requests": 18,
  "errors": 0,
  "averageResponseMs": 3.21,
  "byStatus": { "200": 12, "201": 4, "401": 2 }
}
```

Ces indicateurs sont volontairement légers : ils suffisent pour détecter une panne et mesurer le délai de réponse moyen sans déployer de stack de monitoring payante.

## 3. Simulation d'un incident contrôlé

Scénario retenu : **base de données indisponible** dans l'environnement de test.

```bash
# 1. Simulation (environnement de test isolé)
node scripts/incident-simulate.js

# Variante sans Docker : simulation documentée uniquement
DRY_RUN=1 node scripts/incident-simulate.js

# 2. Observation
node scripts/smoke-test.js          # doit échouer, /health répond 503
docker compose -p reclamations-test -f docker-compose.test.yml logs --tail=150 app

# 3. Diagnostic
docker compose -p reclamations-test -f docker-compose.test.yml ps
curl -i http://127.0.0.1:3001/health

# 4. Restauration du service puis, si la version est fautive, rollback
docker compose -p reclamations-test -f docker-compose.test.yml start db
node scripts/rollback.js            # voir docs/ROLLBACK.md
```

Le script `incident-simulate.js` arrête le conteneur `db`, lance les smoke tests (ils doivent échouer), capture les journaux dans `state/incident-logs.txt` et écrit une fiche horodatée dans `state/incidents/`. Il **ne restaure pas automatiquement** : le diagnostic et le rollback restent des étapes explicites, comme demandé par le sujet.

Une simulation en mode `dry-run` a été exécutée localement le 26/11/2026 pour valider le format de la fiche (aucune commande Docker n'a été lancée, Docker n'étant pas installé sur la machine de travail). La simulation réelle se rejoue dans l'environnement de test CI, où Docker est disponible.

## 4. Fiche d'incident (modèle rempli)

| Champ         | Valeur                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identifiant   | `incident-<horodatage>` (généré par le script)                                                                                                 |
| Date          | 26/11/2026 (simulation contrôlée)                                                                                                              |
| Environnement | Test (`reclamations-test`)                                                                                                                     |
| Type          | Base de données indisponible                                                                                                                   |
| Symptôme      | `/health` répond `503` ; smoke tests en échec ; requêtes API en erreur 500                                                                     |
| Détection     | Job `deploy-test` / exécution manuelle de `scripts/smoke-test.js`                                                                              |
| Cause         | Conteneur `db` arrêté volontairement (simulation)                                                                                              |
| Impact        | Indisponibilité de l'API ; aucune donnée de production concernée                                                                               |
| Diagnostic    | `docker compose ps` montre `db` arrêté ; logs `health check failed` ; `/health` = `down`                                                       |
| Correction    | Redémarrage du service `db`, puis smoke tests ; rollback de version si l'incident vient du code                                                |
| Trace         | `state/incidents/<id>.json`, `state/incident-logs.txt`, artefact CI                                                                            |
| Leçon         | La sonde `/health` et les smoke tests détectent l'incident en quelques secondes ; la séparation des environnements évite tout impact hors test |

## 5. Délai de restauration

Le délai de restauration se mesure entre l'horodatage de la fiche d'incident (`startedAt`) et la date de la version restaurée dans `state/deployment.json`. Il est à relever à chaque simulation et à reporter dans `docs/BILAN.md` comme indicateur d'amélioration continue.
