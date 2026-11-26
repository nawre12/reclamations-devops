# Déploiement automatisé en environnement de test

## 1. Principe

L'environnement de test est **distinct** du développement :

- image immuable `ghcr.io/<depot>:sha-<commit>` (et un tag `:<branche>`) ;
- base PostgreSQL `reclamations_test`, conteneur jetable sur un réseau dédié ;
- port `3001` sur l'hôte, `3000` dans le conteneur ;
- aucun secret réel, aucune donnée de production.

Le déploiement est exécuté par le job `deploy-test` de `.github/workflows/ci.yml` sur un runner GitHub : l'environnement de test y est créé à la demande, ce qui respecte la contrainte « pas d'infrastructure payante » du PDF.

## 2. Déclenchement

| Méthode     | Commande / action                                          | Résultat                                       |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Automatique | push sur `main` ou `develop`                               | image publiée puis déploiement test            |
| Manuel      | **Actions → CI/CD → Run workflow** avec `deploy_test=true` | déploiement test de l'image du commit courant  |
| Local       | `node scripts/deploy.js --image=<image>`                   | déploiement sur la machine disposant de Docker |

Une approbation manuelle peut être exigée dans **Settings → Environments → test → Required reviewers**. Le champ « environment URL » du job est `http://localhost:3001` (adresse sur le runner).

## 3. Séquence automatisée

1. `docker compose -p reclamations-test -f docker-compose.test.yml down -v` : environnement propre.
2. `docker compose pull app` : récupération de l'image publiée dans GHCR.
3. `docker compose up -d app` : démarrage de l'API et de la base (healthcheck PostgreSQL, puis healthcheck applicatif).
4. `node scripts/deploy.js` attend que les smoke tests passent (20 tentatives, 2 secondes d'intervalle).
5. `scripts/smoke-test.js` vérifie :
   - `GET /health` → `200`, `status: ok` et version égale au commit ;
   - `GET /` → interface web servie ;
   - `GET /metrics` → compteurs disponibles ;
   - inscription, connexion, création, lecture et cycle `ouverte → en_cours → resolue` ;
   - affichage d'un rapport JSON avec le code et la durée de chaque contrôle.
6. Les logs et l'état du déploiement sont archivés dans l'artefact `preuves-deploiement-<sha>`.

## 4. Équivalent manuel

```bash
# Variables à adapter
export IMAGE=ghcr.io/<proprietaire>/<depot>:sha-<commit>
export APP_VERSION=<commit>
export JWT_SECRET=<valeur-de-test>
export SMOKE_BASE_URL=http://127.0.0.1:3001

docker compose -p reclamations-test -f docker-compose.test.yml down -v --remove-orphans
node scripts/deploy.js --image="$IMAGE" --version="$APP_VERSION"

# Diagnostic
docker compose -p reclamations-test -f docker-compose.test.yml ps
docker compose -p reclamations-test -f docker-compose.test.yml logs -f app
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/metrics
```

Sous Windows PowerShell, remplacer `export` par `$env:IMAGE = "..."` ou passer par un fichier `.env.test`.

## 5. Version déployée et preuves

| Où lire la version                    | Exemple                                          |
| ------------------------------------- | ------------------------------------------------ |
| `GET /health`                         | `{ "status": "ok", "version": "ci-a9c3fca..." }` |
| Variable `APP_VERSION` du conteneur   | `ci-<sha>`                                       |
| `state/deployment.json` (artefact CI) | version, image, mode, date, version précédente   |
| Tag GHCR                              | `:sha-<commit>` (immuable)                       |

Le rapport complet des smoke tests est écrit dans `state/smoke-result.json` et téléchargé avec les preuves. Si un smoke test échoue, le job échoue et le rollback est documenté dans `docs/ROLLBACK.md`.

## 6. Limite connue

L'environnement de test fourni par le runner est **éphémère** : l'URL `http://localhost:3001` n'existe que pendant le job. C'est suffisant pour démontrer le déploiement et les vérifications demandées par le PDF. Pour un environnement permanent, il faudrait ajouter un hôte (ou un serveur SSH) et un mécanisme de tunnel ; cette extension est décrite comme amélioration dans `docs/BILAN.md` et n'est pas présentée comme opérationnelle ici.
