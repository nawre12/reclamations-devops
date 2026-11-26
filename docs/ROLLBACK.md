# Procédure de retour arrière (rollback)

## 1. Stratégie

- Chaque image publiée possède un tag **immuable** `:sha-<commit>` : une version déjà déployée n'est jamais écrasée.
- Le tag `:<branche>` pointe vers la dernière version de la branche ; le rollback utilise toujours le tag `sha-...`.
- `scripts/deploy.js` enregistre dans `state/deployment.json` la version courante **et la version précédente**, et ajoute chaque déploiement à `state/deployment-history.json` (20 dernières entrées).
- Le rollback redéploie l'image stable, relance les smoke tests et enregistre un nouvel événement avec `mode: rollback`. La trace n'est donc pas perdue.

```text
version stable A ──► déploiement B (défectueuse) ──► incident ──► rollback vers A ──► smoke tests
```

## 2. Procédure automatisée (recommandée)

1. Dans **Actions → Rollback - environnement de test → Run workflow**, indiquer :
   - `image` : `ghcr.io/<proprietaire>/<depot>:sha-<commit-stable>` ;
   - `version` : le même `sha-<commit-stable>` (celui renvoyé par `/health`).
2. Le workflow `rollback.yml` :
   - se connecte à GHCR ;
   - exécute `node scripts/rollback.js --image=... --version=...` ;
   - attend les smoke tests (santé, interface, indicateurs et cycle métier) ;
   - archive `rollback-logs.txt`, `state/deployment.json` et le résultat des smoke tests.
3. Vérifier `GET /health` : le champ `version` doit être la version stable cible.

## 3. Procédure manuelle équivalente

```bash
export IMAGE=ghcr.io/<proprietaire>/<depot>:sha-<commit-stable>
export APP_VERSION=<commit-stable>
export SMOKE_BASE_URL=http://127.0.0.1:3001

node scripts/rollback.js --image="$IMAGE" --version="$APP_VERSION"
# ou, pour reprendre automatiquement la version précédente enregistrée :
node scripts/rollback.js
```

Sans arguments, le script lit `state/deployment.json` et `state/deployment-history.json` et choisit la dernière version réussie différente de la version courante. S'il ne trouve rien, il échoue explicitement plutôt que de déployer une version inconnue.

## 4. Vérification après rollback

| Contrôle    | Commande                             | Critère                                    |
| ----------- | ------------------------------------ | ------------------------------------------ |
| Santé       | `curl http://127.0.0.1:3001/health`  | `status: ok`, version cible                |
| Interface   | `curl http://127.0.0.1:3001/`        | HTTP 200                                   |
| Indicateurs | `curl http://127.0.0.1:3001/metrics` | compteurs présents                         |
| Métier      | `node scripts/smoke-test.js`         | toutes les étapes vertes                   |
| Traçabilité | `type state/deployment.json`         | `mode: rollback`, date, version précédente |

Le rollback ne supprime pas les données par lui-même : en cas de migration de schéma incompatible, il faut prévoir une migration inverse. Le schéma actuel étant créé avec `CREATE TABLE IF NOT EXISTS`, le retour à une version antérieure reste compatible.

## 5. Démonstration exécutée

Une démonstration **en mode simulation** a été exécutée le 26/11/2026 sur la machine de travail (Docker non installé localement) :

```text
1. DRY_RUN=1 node scripts/deploy.js    --image=reclamations:stable-1 --version=stable-1
2. DRY_RUN=1 node scripts/deploy.js    --image=reclamations:broken-2  --version=broken-2
3. DRY_RUN=1 node scripts/rollback.js  --image=reclamations:stable-1 --version=stable-1
4. Vérification de state/deployment.json : version = stable-1, mode = rollback
```

Ce mode valide la logique de traçabilité et de choix de version sans démarrer de conteneur. La démonstration réelle (déploiement de l'image, smoke tests et rollback) s'exécute dans l'environnement de test CI via `rollback.yml`, où Docker est disponible. Les deux modes sont documentés séparément pour ne pas présenter une simulation comme un déploiement réel.
