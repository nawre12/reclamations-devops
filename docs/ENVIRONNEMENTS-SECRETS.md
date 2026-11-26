# Matrice des environnements, configurations et secrets

Aucun mot de passe, jeton ou clé réelle n'est versionné. Les fichiers `.env.example` et `.env.test.example` ne contiennent que des **valeurs factices** et servent de documentation.

## 1. Matrice des environnements

| Paramètre                             | Développement local                                                | Test (CI / `docker-compose.test.yml`)                               | Production (non incluse) |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------ |
| `PORT`                                | `3000`                                                             | `3000` dans le conteneur, `3001` sur l'hôte                         | à définir                |
| `DATABASE_URL`                        | `postgres://...@localhost:5432/reclamations`                       | `postgres://...:5432/reclamations_test` (service `db`)              | à fournir par secret     |
| `POSTGRES_DB`                         | `reclamations`                                                     | `reclamations_test`                                                 | à définir                |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | valeurs d'exemple `postgres` / `postgres`, à remplacer dans `.env` | valeurs de test, identifiants de conteneur jetable                  | secrets-O                |
| `JWT_SECRET`                          | `.env` local (non versionné)                                       | `${{ secrets.JWT_SECRET_TEST }}` ou valeur générée par exécution CI | secret-O                 |
| `APP_VERSION`                         | `dev-local`                                                        | `ci-<sha>`                                                          | tag de release           |
| `IMAGE`                               | image construite localement                                        | `ghcr.io/<depot>:sha-<commit>`                                      | tag immuable             |
| Données                               | volume persistant `db-data`                                        | base éphémère (`down -v`)                                           | sauvegardes à prévoir    |
| Orchestration                         | `docker-compose.yml`                                               | `docker-compose.test.yml`                                           | hors périmètre du projet |

Le point important : **la base de test est distincte** (nom, réseau et cycle de vie séparés). Les tests JUnit/Jest utilisent `reclamations_test` et la CI redémarre un conteneur PostgreSQL neuf à chaque exécution.

## 2. Où sont définies les valeurs

| Canal                           | Contenu                                         | Versionné ?                  |
| ------------------------------- | ----------------------------------------------- | ---------------------------- |
| `.env` (local)                  | configuration de développement                  | Non (`.gitignore`)           |
| `.env.example`                  | modèle commenté, sans secret                    | Oui                          |
| `.env.test.example`             | modèle de test, sans secret                     | Oui                          |
| Variables du job GitHub Actions | `DATABASE_URL`, `APP_VERSION`, `SMOKE_BASE_URL` | Oui (valeurs non sensibles)  |
| Secrets du dépôt GitHub         | `JWT_SECRET_TEST` (optionnel)                   | Non (chiffrés par GitHub)    |
| `github.run_id`                 | valeur de repli pour le JWT éphémère du test    | Non (générée à l'exécution)  |
| `GITHUB_TOKEN`                  | publication GHCR                                | Non (fourni automatiquement) |

Pour créer le secret facultatif : **Settings → Secrets and variables → Actions → New repository secret**, nom `JWT_SECRET_TEST`. Sans ce secret, le pipeline utilise un identifiant d'exécution comme valeur de test : l'application fonctionne pendant le job, mais rien n'est réutilisable ni committé. Ce n'est **pas** une pratique de production.

## 3. Bonnes pratiques appliquées

- `src/config.js` lit `process.env` et échoue au démarrage si `JWT_SECRET` est absent ;
- `src/server.js` appelle `config.getJwtSecret()` avant d'ouvrir le port : pas de démarrage « à moitié configuré » ;
- le script `scripts/secret-scan.js` inspecte tous les fichiers suivis par Git et échoue sur une clé privée, un jeton GitHub/AWS/Slack ou un JWT signé ;
- le Dockerfile ne copie ni `.env`, ni `state/`, ni `docs/` (voir `.dockerignore`) ;
- l'image s'exécute avec un utilisateur non-root `app`.

## 4. Rotation d'un secret

1. Générer une nouvelle valeur côté plateforme (secret du dépôt ou `.env` local).
2. Mettre à jour le secret GitHub ; les exécutions en cours gardent l'ancienne valeur, la suivante utilisera la nouvelle.
3. Redéployer l'environnement de test (`workflow_dispatch` avec `deploy_test=true`) : les tokens JWT déjà émis deviennent invalides, ce qui est le comportement attendu.
4. Vérifier `/health` et les smoke tests ; noter la date de rotation dans le bilan.

## 5. Erreurs fréquentes

| Symptôme                               | Cause probable                               | Correction                                           |
| -------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `JWT_SECRET manquant` au démarrage     | variable absente                             | renseigner `.env` ou le secret CI                    |
| `/health` répond `503`                 | base inaccessible ou mauvaise `DATABASE_URL` | vérifier le service `db` et les logs                 |
| `docker compose ... JWT_SECRET requis` | interpolation sans valeur                    | exporter la variable ou créer `.env`                 |
| Tests intégration en échec en local    | base `reclamations_test` absente             | démarrer PostgreSQL ou utiliser le conteneur de test |
