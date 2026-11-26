# Scénario de démonstration — « faites une modification et montrez-moi »

Ce document répond à une demande précise du professeur : **modifier quelque chose dans le projet et montrer que la chaîne DevOps réagit toute seule**. Il est écrit pour être lu et suivi pendant la soutenance.

## 1. Explication en une phrase

> L'application est un petit site de gestion des réclamations. Le projet n'est pas de créer un gros site : c'est de construire une **usine automatique** qui, dès qu'on change une ligne de code, vérifie, teste, construit, publie, déploie et vérifie encore.

Le professeur veut voir **le lien entre ta modification et la réaction de l'usine** :

```text
je change 1 ligne → je pousse → le pipeline démarre → tests verts → image publiée → déploiement → smoke tests verts
```

## 2. La modification la plus simple et la plus sûre

Fichier : `public/index.html` (la page web).

Ligne à modifier :

```html
<button id="register" type="button">S'inscrire</button>
```

Remplacer seulement le texte du bouton :

```html
<button id="register" type="button">Créer un compte</button>
```

Pourquoi celle-ci ?

- elle est **visible tout de suite** dans le navigateur ;
- elle ne touche pas aux tests (ils ne vérifient pas le texte du bouton) ;
- elle ne casse pas le smoke test (qui vérifie seulement le titre « Gestion des réclamations »).

Variantes possibles : changer le sous-titre, ajouter un emoji dans le `<h1>`, changer le texte d'un autre bouton. Évite de toucher à `src/`, `tests/` ou aux fichiers YAML pendant la démo.

## 3. Déroulé complet

| Étape | Action                                                                                                                                        | Ce que le professeur voit            | Phrase à dire                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1     | `git status` puis `git checkout develop` puis `git pull`                                                                                      | branche propre                       | « Je pars de la branche d'intégration à jour. »                                           |
| 2     | `git checkout -b feature/demo-modification`                                                                                                   | nouvelle branche                     | « Je crée une branche pour ma modification, comme dans le guide de contribution. »        |
| 3     | Modifier le bouton dans `public/index.html`                                                                                                   | texte changé dans l'éditeur          | « Je change une ligne visible : le libellé du bouton d'inscription. »                     |
| 4     | `npm run verify`                                                                                                                              | lint + format + 21 tests verts       | « Avant de pousser, je vérifie localement : tout passe. »                                 |
| 5     | Lancer `npm start` et ouvrir `http://localhost:3000`                                                                                          | nouveau texte affiché                | « Voici la modification dans l'application. »                                             |
| 6     | `git add public/index.html` puis `git commit -m "demo: renommer le bouton d'inscription"` puis `git push -u origin feature/demo-modification` | commit visible sur GitHub            | « Je pousse sur ma branche ; le pipeline se déclenche déjà. »                             |
| 7     | GitHub → **Pull requests** → **New pull request** → `compare: feature/demo-modification` → `base: develop`                                    | PR ouverte avec les checks           | « J'ouvre une Pull Request : c'est la revue demandée dans le lot 1. »                     |
| 8     | Attendre que les 4 premiers jobs soient verts                                                                                                 | quality, unit, intégration, sécurité | « Quality gate : format, lint, tests, couverture et sécurité sont verts. »                |
| 9     | Cliquer **Merge pull request**                                                                                                                | fusion dans `develop`                | « Je fusionne : ce push sur develop déclenche le déploiement en test. »                   |
| 10    | Onglet **Actions** → ouvrir le run le plus récent                                                                                             | 7 jobs et leurs étapes               | « Voici la chaîne complète, job par job. »                                                |
| 11    | Ouvrir l'artefact `couverture-<sha>`                                                                                                          | rapport de couverture                | « Le rapport est archivé, il n'est pas seulement dans la console. »                       |
| 12    | Onglet **Packages**                                                                                                                           | image `ghcr.io/...:sha-<commit>`     | « L'image porte le numéro du commit : on peut toujours revenir à cette version. »         |
| 13    | Ouvrir le job `deploy-test` → `preuves-deploiement-<sha>`                                                                                     | logs + `smoke-result.json`           | « Les smoke tests ont vérifié santé, interface, indicateurs et cycle d'une réclamation. » |
| 14    | (optionnel) `node scripts/incident-simulate.js` puis `node scripts/rollback.js`                                                               | fiche d'incident + rollback          | « En cas de panne, je diagnostique depuis les logs puis je reviens à la version stable. » |

## 4. Commandes prêtes à copier (PowerShell)

```powershell
git status
git checkout develop
git pull origin develop
git checkout -b feature/demo-modification

# Modifier public/index.html : "S'inscrire" -> "Créer un compte"

npm run verify

$env:JWT_SECRET = 'demo-secret-local'
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/reclamations_test'
npm start
# ouvrir http://localhost:3000 dans le navigateur, puis Ctrl+C pour arrêter

git add public/index.html
git commit -m "demo: renommer le bouton d'inscription"
git push -u origin feature/demo-modification
```

Ensuite, tout se fait dans le navigateur GitHub (étapes 7 à 13 du tableau).

### Version courte (si le professeur veut aller vite)

Si tu n'as pas le temps d'ouvrir une PR, fais directement sur `develop` :

```powershell
git checkout develop
git pull origin develop
# modifier la ligne
npm run verify
git add public/index.html
git commit -m "demo: renommer le bouton d'inscription"
git push origin develop
```

Le run sur `develop` fera aussi le déploiement. Tu perds juste la démonstration de la Pull Request.

## 5. Si quelque chose ne va pas

| Problème                                  | Réaction à avoir                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test` échoue en local                | PostgreSQL local absent : dire « les tests tournent dans la CI avec un service PostgreSQL dédié », puis montrer le job vert dans Actions. |
| `git push` demande un mot de passe        | Utiliser le gestionnaire d'identifiants Windows ou un token d'accès personnel ; ne jamais le coller dans le chat ni dans un fichier.      |
| Le texte ne change pas dans le navigateur | Recharger la page avec `Ctrl+F5` (cache du navigateur).                                                                                   |
| Un job est rouge                          | Ne pas le cacher : ouvrir le job, lire l'étape en échec, expliquer la cause, corriger par un nouveau commit.                              |
| L'URL `localhost:3001` ne répond pas      | C'est normal : elle n'existe que pendant le job. Montrer le fichier `smoke-result.json` archivé comme preuve.                             |

## 6. Ce qu'il faut dire clairement

- « Le métier n'est pas le cœur du projet : c'est la chaîne DevOps. »
- « Les simulations locales sont en `dry-run`; le vrai déploiement se fait dans GitHub Actions. »
- « Je n'ai pas mis de secret dans le dépôt : ils viennent des variables d'environnement. »

## 7. Ce que le scénario démontre par rapport au barème

| Critères couverts                     | Points |
| ------------------------------------- | ------ |
| Organisation Git, branche, commit, PR | 10     |
| Pipeline, déclencheurs, jobs, logs    | 15     |
| Artefact et image versionnée          | 10     |
| Tests, couverture, quality gate       | 15     |
| Conteneurisation (vue dans la CI)     | 10     |
| Secrets et configurations             | 10     |
| Sécurité (audit, secrets, Trivy)      | 10     |
| Déploiement, smoke tests, rollback    | 10     |
| Supervision et diagnostic             | 5      |
| Documentation et maîtrise             | 5      |
