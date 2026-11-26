# Bilan des difficultés, validation et améliorations

## 1. Validation minimale (section 12 du PDF)

| Critère                                                         | État | Preuve                                                                                             |
| --------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| Dépôt structuré, stratégie de branches documentée               | ✅   | `CONTRIBUTING.md`, branches et PR sur GitHub                                                       |
| Pipeline défini sous forme de code et déclenché automatiquement | ✅   | `.github/workflows/ci.yml`, historique **Actions**                                                 |
| Dépendances et construction automatisées                        | ✅   | `npm ci`, `package-lock.json`, job `build-artifact`                                                |
| Contrôles qualité et tests automatisés exécutés                 | ✅   | jobs `quality`, `unit-tests`, `integration-tests`, `coverage/`                                     |
| Artefact ou image produit et versionné                          | ✅   | `reclamations-<sha>.tar.gz`, `ghcr.io/<depot>:sha-<sha>`                                           |
| Application conteneurisée et reproductible                      | ✅   | `Dockerfile`, `docker-compose.yml`, `docker-compose.test.yml`                                      |
| Configurations séparées, secrets protégés                       | ✅   | `docs/ENVIRONNEMENTS-SECRETS.md`, `.env.example`, aucun secret versionné                           |
| Au moins un contrôle de sécurité intégré                        | ✅   | audit npm, détection de secrets, Trivy, Dependabot                                                 |
| Déploiement en environnement de test automatisé                 | ✅   | job `deploy-test`, `scripts/deploy.js`                                                             |
| Smoke tests et sonde de santé                                   | ✅   | `scripts/smoke-test.js`, `/health`, `/metrics`                                                     |
| Procédure de rollback documentée et démontrée                   | ✅   | `docs/ROLLBACK.md`, `scripts/rollback.js`, `rollback.yml` (démo locale en `dry-run`, réelle en CI) |
| Logs permettant de diagnostiquer un incident simple             | ✅   | logs JSON, `docs/SUPERVISION-INCIDENT.md`, fiche d'incident                                        |

Ce qui est marqué ✅ est démontrable dans le dépôt ou dans GitHub Actions. Les simulations `dry-run` faites localement sont explicitement signalées comme telles et ne sont pas présentées comme des déploiements réels.

## 2. Difficultés rencontrées

| Difficulté                                                                            | Résolution apportée                                                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Le premier jet de la branche `feature/ci-pipeline` contenait un fichier `ci.yml` vide | Pipeline complet réécrit et découpé en 7 jobs avec dépendances et quality gates                                     |
| Tests d'intégration dépendants d'une base                                             | Service PostgreSQL dédié dans la CI et base `reclamations_test` séparée en local                                    |
| Risque de secrets dans le dépôt                                                       | `.gitignore`, fichiers d'exemple factices, script de détection, secret CI optionnel ou valeur générée par exécution |
| Publication d'image sans infrastructure payante                                       | GHCR + `GITHUB_TOKEN`, image construite et scannée sur le runner                                                    |
| Docker absent de la machine de préparation                                            | Validation locale avec PostgreSQL et scripts en `dry-run` ; validation réelle déléguée à la CI                      |
| Choix du périmètre applicatif                                                         | Application volontairement simple mais stable : l'évaluation porte sur la chaîne, pas sur le métier                 |

## 3. Indicateurs de suivi (section 13 du PDF)

| Indicateur                                     | Source                                         | Valeur / mode de relevé                                                                                           |
| ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Taux de réussite des pipelines                 | Historique GitHub Actions                      | à relever sur les 10 dernières exécutions                                                                         |
| Durée moyenne d'exécution                      | Durée affichée par job dans Actions            | à relever après plusieurs exécutions                                                                              |
| Fréquence des intégrations / déploiements      | Nombre de push, PR et exécutions `deploy-test` | à relever sur le tableau de bord du dépôt                                                                         |
| Taux de couverture                             | artefact `couverture-<sha>` (`lcov.info`)      | seuils : 70 % énoncés / 60 % branches / 70 % fonctions / 70 % lignes ; dernière mesure locale : 90,57 % d'énoncés |
| Défauts détectés avant déploiement             | Jobs `unit-tests` et `integration-tests`       | tout échec bloque l'artefact                                                                                      |
| Vulnérabilités détectées et corrigées          | `npm audit`, Trivy                             | 0 alerte npm au 26/11/2026 ; rapport Trivy en artefact                                                            |
| Échecs de déploiement et délai de restauration | `state/deployment.json`, fiches d'incident     | à mesurer entre `startedAt` de l'incident et la date du rollback                                                  |

## 4. Améliorations proposées

1. **Environnement de test persistant** : déployer sur un petit serveur via SSH (ou un service gratuit) pour obtenir une URL consultable hors du job CI, avec rotation automatique du tag.
2. **Notifications** : alertes Slack/e-mail sur échec de pipeline ou smoke test.
3. **Monitoring** : exporter `/metrics` vers Prometheus + Grafana et définir des alertes sur `errors` et `averageResponseMs`.
4. **Sécurité** : signer les images (cosign), activer la vérification de signature avant déploiement, ajouter un scan SBOM.
5. **Base de données** : migration versionnée (ex. migrations SQL) et sauvegardes avant déploiement, pour rendre le rollback sûr même en cas de changement de schéma.
6. **Indicateurs** : script de synthèse hebdomadaire qui calcule automatiquement le taux de réussite et la durée moyenne via l'API GitHub.

## 5. Ce qui n'est pas fait (et pourquoi)

- Pas de Kubernetes ni de cloud payant : le PDF les rend optionnels et autorise une solution locale gratuite.
- Pas d'environnement public permanent : le runner GitHub fournit un environnement de test éphémère suffisant pour la démonstration.
- Pas d'alerte Trivy traitée spécifiquement : aucun rapport local n'est disponible sans Docker ; la politique de remédiation est documentée dans `docs/SECURITE.md` et le rapport réel est archivé en CI.
- Pas de secrets réels dans le dépôt : les valeurs de test sont générées à l'exécution ou fournies par les secrets GitHub.

Cette liste est volontairement explicite : conformément aux consignes du PDF, aucune étape non réalisée n'est présentée comme opérationnelle.
