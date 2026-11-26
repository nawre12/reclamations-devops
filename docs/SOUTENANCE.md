# Présentation synthétique et scénario de soutenance

Durée indicative : 10 à 12 minutes de démonstration + questions. Le barème du PDF est sur 100 points ; ce scénario couvre les 24 actions attendues de la section 10.

## 1. Plan de démonstration

| #   | Action à montrer                                   | Où / commande                                                                       | Message clé                                                                     |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Présenter l'application, le dépôt et les branches  | `http://localhost:3000`, `git branch -a`, `CONTRIBUTING.md`                         | API + interface web, `main` stable, `develop` intégration                       |
| 2   | Faire une petite modification et la pousser        | modifier le titre dans `public/index.html`, `git commit -m "docs: ..."`, `git push` | Le push déclenche la chaîne                                                     |
| 3   | Montrer le pipeline et ses étapes                  | onglet **Actions** → exécution en cours                                             | 7 jobs, dépendances, logs lisibles                                              |
| 4   | Montrer un test automatique et son rapport         | job `integration-tests`, artefact `couverture-<sha>`                                | Tests API sur base séparée + seuil de couverture                                |
| 5   | Présenter l'image versionnée et sa publication     | onglet **Packages**, tag `sha-<commit>`                                             | Artefact et image immuables, traçables                                          |
| 6   | Montrer le déploiement en test et la disponibilité | job `deploy-test`, `GET /health`, `GET /metrics`                                    | Environnement distinct, smoke tests verts                                       |
| 7   | Présenter la sécurité et une alerte / correction   | jobs `security` et `image`, `docs/SECURITE.md`                                      | Audit 0 alerte, correction par lockfile, justification des identifiants de test |
| 8   | Simuler un incident, diagnostiquer, rollback       | `node scripts/incident-simulate.js`, logs, `node scripts/rollback.js`               | Supervision puis restauration d'une version stable                              |
| 9   | Expliquer les choix, limites et améliorations      | `docs/BILAN.md`                                                                     | Pas de Kubernetes/cloud payant, chaîne complète et démontrable                  |

## 2. Les 7 lots en une phrase chacun

1. **Git** : dépôt structuré, branches `main`/`develop`/`feature`, commits conventionnés, PR avec revue.
2. **CI** : `ci.yml` déclenché sur push et PR, `npm ci` reproductible, artefact `reclamations-<sha>.tar.gz`.
3. **Qualité** : Prettier, ESLint, tests unitaires et API, couverture avec quality gate.
4. **Conteneurs** : Dockerfile non-root, Compose développement et test, image publiée sur GHCR.
5. **Sécurité** : externalisation des secrets, audit npm, détection de secrets, Trivy, Dependabot.
6. **Déploiement** : environnement test automatisé, smoke tests, `/health`, trace de version.
7. **Exploitation** : logs JSON, `/metrics`, incident simulé, rollback documenté et exécutable.

## 3. Flux à expliquer oralement

> Une modification est poussée sur `develop`. Le pipeline vérifie d'abord le formatage et le lint, puis les tests unitaires et les tests API sur une base PostgreSQL séparée, et enfin la sécurité. Si tout est vert, il construit un artefact archivé et une image Docker. Trivy analyse l'image avant sa publication sur GHCR avec un tag lié au commit. Le job de déploiement tire cette image dans l'environnement de test, démarre l'API et la base, puis exécute des smoke tests : santé, interface, indicateurs et cycle de vie d'une réclamation. Les logs et la version déployée sont archivés. En cas d'incident, le diagnostic se fait à partir des logs et de `/health`, puis `rollback.yml` redéploie le tag stable et rejoue les smoke tests.

## 4. Questions probables et réponses courtes

| Question                                                 | Réponse attendue                                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pourquoi `npm ci` plutôt que `npm install` ?             | Parce que le lockfile est figé : même installation sur la machine et dans la CI.                                 |
| Quelle est la différence entre `/health` et `/metrics` ? | `/health` dit si le service répond (et teste la base) ; `/metrics` donne des compteurs et des durées.            |
| Où passe le secret JWT ?                                 | Variable d'environnement, secret GitHub pour le test, jamais dans le dépôt ni dans l'image.                      |
| Pourquoi publier un tag `sha-...` ?                      | Pour pouvoir redéployer exactement la même version lors d'un rollback.                                           |
| Quel est le quality gate ?                               | Échec immédiat si lint, test, couverture, audit ou Trivy échoue ; aucun artefact n'est publié.                   |
| Que se passe-t-il si Trivy trouve une faille ?           | Le job échoue, l'image n'est pas poussée ; on corrige ou on documente la justification.                          |
| Pourquoi pas Kubernetes ?                                | Le PDF autorise explicitement une solution locale/gratuite ; l'essentiel est de démontrer chaque exigence.       |
| Le rollback supprime-t-il les données ?                  | Non. Le schéma est compatible (`IF NOT EXISTS`) ; une migration inverse serait à prévoir si le schéma changeait. |

## 5. Choix techniques assumés

- Node.js/Express et Jest : technologies simples, déjà utilisées dans le module, rapides à démarrer.
- GitHub Actions + GHCR : pipeline as code et registre intégrés au dépôt, sans coût supplémentaire.
- Docker Compose pour le test : reproductible sans cluster.
- Approbation manuelle facultative via l'environnement `test` de GitHub.
- Secret de test généré par exécution si `JWT_SECRET_TEST` n'est pas défini : aucun secret réel n'est stocké.

## 6. Limites à annoncer

- L'environnement de test du runner est éphémère (pas d'URL publique persistante).
- Le scan Trivy et le déploiement Docker réels s'exécutent en CI (Docker absent de la machine locale utilisée pour préparer le dépôt).
- Les simulations locales de déploiement/incident/rollback sont des `dry-run` clairement identifiés.
- Aucune notification (Slack/e-mail) n'est configurée : les preuves sont les artefacts GitHub Actions.
