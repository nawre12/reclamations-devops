# Explication simple — à lire avant la soutenance

## 1. C’est quoi ce projet ?

C’est **un petit site de réclamations** + **une usine automatique**.

- Le site : on s’inscrit, on se connecte, on crée une réclamation, on change son statut.
- L’usine : GitHub Actions fait les vérifications, les tests, l’image Docker, le déploiement et les contrôles **tous seuls** après chaque `push`.

> Le professeur ne juge pas la taille du site. Il juge la chaîne : est-ce que je sais montrer qu’une modification déclenche tout ?

## 2. Pourquoi on a fait ça ?

Avant :

```text
développeur modifie le code → envoie les fichiers à quelqu’un → déploiement manuel → erreurs possibles
```

Maintenant :

```text
je pousse → tests automatiques → image versionnée → déploiement test → smoke tests → preuves
```

## 3. La seule modification à montrer

Une modification est **déjà faite et poussée** dans `public/index.html` :

```html
Interface web minimale — modification visible pour la soutenance.
```

Pour la refaire en direct devant le professeur, change le bouton :

```html
S'inscrire → Créer un compte
```

C’est une ligne visible, ça ne casse aucun test, et le pipeline redémarre automatiquement.

## 4. La chaîne DevOps, partie par partie

Les fichiers cachés commencent par un point (`.github`, `.env...`) : ils sont bien dans le projet, il faut juste les afficher dans l’éditeur.

| Partie                  | Où c’est                                                                                              | Ce que ça fait                             | Comment je l’utilise                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Code + branches         | `src/`, `public/`, `package.json`, `CONTRIBUTING.md`                                                  | API, interface web, règle `main`/`develop` | `git status`, `git checkout develop`, `git pull`                     |
| Déclencheur du pipeline | `.github/workflows/ci.yml` (section `on:`)                                                            | Démarre sur `push` et `pull request`       | je pousse ou j’ouvre une PR                                          |
| Qualité                 | `.prettierrc`, `eslint.config.js`, `package.json`                                                     | Formatage + lint                           | `npm run lint`, `npm run format:check`                               |
| Tests                   | `tests/unit/`, `tests/integration/`, `tests/setup-env.js`, `package.json` (Jest)                      | 21 tests + couverture                      | `npm test`                                                           |
| Vérification totale     | `package.json` (script `verify`)                                                                      | lint + format + tests en une commande      | `npm run verify`                                                     |
| Artefact versionné      | `.github/workflows/ci.yml` → job `build-artifact`                                                     | Archive `reclamations-<sha>.tar.gz`        | la télécharger dans l’onglet Actions                                 |
| Image Docker            | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.test.yml`                        | Construit l’image et les environnements    | `docker compose up --build` si Docker est installé                   |
| Registre                | `.github/workflows/ci.yml` → job `image`, puis onglet **Packages**                                    | Publie `ghcr.io/...:sha-<commit>`          | regarder le tag du commit dans Packages                              |
| Sécurité                | `scripts/secret-scan.js`, `.github/dependabot.yml`, Trivy dans `ci.yml`, `docs/SECURITE.md`           | Audit npm, secrets, failles de l’image     | `npm run security:audit`, `npm run security:secrets`                 |
| Secrets / config        | `.env.example`, `.env.test.example`, `src/config.js`, `docs/ENVIRONNEMENTS-SECRETS.md`                | Sépare la config des secrets               | copier `.env.example` en `.env`, jamais le committer                 |
| Déploiement             | `scripts/deploy.js`, `scripts/deploy-lib.js`, `docs/DEPLOIEMENT.md`, job `deploy-test`                | Démarre l’image dans l’environnement test  | `node scripts/deploy.js --dry-run` en local ; vrai déploiement en CI |
| Smoke tests             | `scripts/smoke-test.js`, `docs/SUPERVISION-INCIDENT.md`                                               | Vérifie l’appli après déploiement          | `npm run test:smoke`                                                 |
| Santé / métriques       | `src/app.js`, `src/status.js`, `src/metrics.js`, `src/logger.js`                                      | `/health`, `/metrics`, logs JSON           | ouvrir `http://localhost:3000/health`                                |
| Incident                | `scripts/incident-simulate.js`, `state/incidents/`, `docs/SUPERVISION-INCIDENT.md`                    | Simule une panne et écrit une fiche        | `node scripts/incident-simulate.js`                                  |
| Rollback                | `scripts/rollback.js`, `.github/workflows/rollback.yml`, `docs/ROLLBACK.md`, `state/deployment*.json` | Revient à une version stable               | `node scripts/rollback.js --dry-run` ou le workflow manuel           |
| Documentation           | `docs/`                                                                                               | Toutes les explications                    | commencer ici, puis `GUIDE-PROJET.md`                                |

## 5. Ce que je montre sur GitHub

Ouvre l’onglet **Actions** :

1. `Qualité` : formatage et lint verts.
2. `Tests unitaires` et `Tests API + couverture` : 21 tests verts.
3. `Sécurité` : audit npm et détection de secrets verts.
4. `Artefact versionné` : l’archive du code est téléchargeable.
5. `Image Docker + scan Trivy` : l’image est scannée puis publiée.
6. `Déploiement test + smoke tests` : l’application est démarrée et vérifiée.

Dans **Packages**, montre le tag `sha-<commit>` : c’est la version exacte du code.

Dans l’artefact `preuves-deploiement-<sha>`, montre `smoke-result.json` : c’est la preuve que ça marche après déploiement.

## 6. Les phrases à dire

- « Je change une ligne visible, je pousse, et le pipeline se déclenche tout seul. »
- « Si un test échoue, rien n’est publié : c’est le quality gate. »
- « L’image porte le numéro du commit, donc on peut revenir à cette version. »
- « Les smoke tests vérifient la santé, la page, les indicateurs et une réclamation complète. »
- « Les scripts locaux sont en `dry-run`; le vrai déploiement est dans GitHub Actions. »

## 7. Ce qu’il ne faut pas dire

- « J’ai déployé sur un serveur public permanent. » → Non : l’environnement de test est éphémère dans la CI.
- « J’ai utilisé Kubernetes. » → Non : Docker Compose suffit et le PDF l’autorise.
- « J’ai mis les secrets dans le dépôt. » → Non : ils viennent des variables d’environnement / secrets GitHub.

## 8. Si on me demande « mais concrètement, tu as changé quoi ? »

Réponse courte :

> « J’ai changé le texte affiché dans `public/index.html`. Ce commit a fait tourner le pipeline : tests verts, image `sha-...`, déploiement en test et smoke tests verts. Voilà l’exécution. »

## 9. Les autres documents

- `GUIDE-PROJET.md` : le projet en détail.
- `SCENARIO-DEMO.md` : le pas-à-pas complet.
- `PIPELINE.md` : les 7 jobs expliqués.
- `BILAN.md` : ce qui est fait et les limites.
