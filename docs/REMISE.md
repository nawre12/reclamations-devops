# Fiche synthétique de remise

| Information                                | Valeur                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Nom(s) et prénom(s)                        | Ferjani Nawres (à compléter si travail en binôme)                                                             |
| Intitulé de l'application                  | API web de gestion des réclamations (Node.js/Express + PostgreSQL)                                            |
| Lien du dépôt Git                          | https://github.com/nawre12/reclamations-devops                                                                |
| Technologies de l'application              | Node.js 20, Express 4, PostgreSQL 16, JWT, interface web statique                                             |
| Plateforme CI/CD utilisée                  | GitHub Actions (`.github/workflows/ci.yml`)                                                                   |
| Registre d'images / artefacts              | GitHub Container Registry (GHCR) + artefacts GitHub Actions                                                   |
| Environnement de test et procédure d'accès | `docker-compose.test.yml` sur le runner CI, http://localhost:3001 pendant le job ; voir `docs/DEPLOIEMENT.md` |
| Contrôle(s) de sécurité intégré(s)         | `npm audit --audit-level=high`, détection de secrets, scan Trivy de l'image, Dependabot                       |
| Procédure de rollback                      | `docs/ROLLBACK.md` et workflow manuel `.github/workflows/rollback.yml`                                        |
| Date de remise                             | 26/11/2026 (à ajuster selon la date de remise)                                                                |

## Documents joints

- `GUIDE-PROJET.md` — compréhension du projet, architecture, 7 lots, 15 livrables.
- `PIPELINE.md` — explication détaillée des jobs et des quality gates.
- `ENVIRONNEMENTS-SECRETS.md` — matrice des configurations et gestion des secrets.
- `SECURITE.md` — contrôles, résultats et remédiation.
- `DEPLOIEMENT.md` — procédure de déploiement et smoke tests.
- `SUPERVISION-INCIDENT.md` — logs, indicateurs et fiche d'incident.
- `ROLLBACK.md` — procédure de retour arrière et démonstration.
- `SOUTENANCE.md` — scénario de démonstration et réponses aux questions.
- `BILAN.md` — difficultés, validation et améliorations.
