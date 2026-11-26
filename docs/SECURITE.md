# Sécurité — contrôles intégrés, résultats et remédiation

Le PDF demande **au moins un contrôle de sécurité**, l'analyse des résultats et soit la correction d'une alerte, soit la justification précise d'une alerte non corrigée. Quatre contrôles sont intégrés à la chaîne.

## 1. Contrôles intégrés

| Contrôle                       | Outil                                 | Où                                                 | Ce que cela bloque                                                                    |
| ------------------------------ | ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Vulnérabilités des dépendances | `npm audit --audit-level=high`        | Job `security` + script `npm run security:audit`   | Toute dépendance avec une alerte `high` ou `critical`                                 |
| Secrets versionnés             | `scripts/secret-scan.js`              | Job `security` + script `npm run security:secrets` | Clé privée, jeton GitHub/AWS/Slack ou JWT signé présent dans un fichier suivi par Git |
| Mises à jour de dépendances    | Dependabot (`.github/dependabot.yml`) | PR hebdomadaires npm et GitHub Actions             | Obsolescence des dépendances et des actions de pipeline                               |
| Vulnérabilités de l'image      | Trivy (`aquasecurity/trivy-action`)   | Job `image`                                        | Alertes `CRITICAL`/`HIGH` non corrigées dans l'image publiée                          |

Mesures complémentaires : image Docker multi-étapes, utilisateur non-root, `.dockerignore` qui exclut `.env`, `state/` et l'historique Git, permissions GitHub minimales, jetons de test non réutilisables.

## 2. Résultats observés localement (26/11/2026)

```text
$ npm run security:audit
found 0 vulnerabilities

$ npm run security:secrets
{ "ok": true, "filesScanned": 19, ... }
```

Le rapport Trivy est produit **dans la CI** (l'environnement local de travail ne dispose pas de Docker) et archivé comme artefact `trivy-<sha>` même lorsque le scan échoue. Aucun résultat Trivy n'est inventé ici : consulter l'artefact de la dernière exécution pour le rapport réel.

## 3. Analyse et actions correctives

### Alerte traitée : dépendance Express

Le manifeste déclare `express: ^4.19.2`. Le lockfile épingle **express 4.22.3**, `jsonwebtoken 9.0.3` et `pg 8.23.1`, c'est-à-dire des versions correctrices disponibles à la date du projet. L'action corrective appliquée est de **conserver `package-lock.json` versionné et d'utiliser exclusivement `npm ci`** dans le pipeline : la construction est donc reproductible et ne réintroduit pas une version vulnérable. Dependabot ouvre une PR si une nouvelle alerte apparaît.

### Alerte justifiée : identifiants PostgreSQL de test

`docker-compose.test.yml` utilise des identifiants de conteneur (`postgres` / `postgres`). Ce n'est **pas un secret applicatif** : la base `reclamations_test` est éphémère, recréée à chaque exécution, isolée sur un réseau Docker dédié et ne contient que des données de test générées par les tests et les smoke tests. Le `JWT_SECRET` de test est fourni par un secret GitHub ou généré par exécution, jamais écrit dans le dépôt. En environnement de production, ces valeurs devront être remplacées par des secrets fournis par la plateforme (voir `docs/ENVIRONNEMENTS-SECRETS.md`).

### Politique Trivy

- `CRITICAL` / `HIGH` non corrigées → pipeline échoue, image non publiée ;
- alerte sans correctif disponible (`ignore-unfixed: true`) → documenter ici avec le paquet, la version, l'impact et la date de réévaluation ;
- alerte corrigée → montée de version du paquet de base ou de la dépendance, puis nouveau scan.

Aucune alerte Trivy spécifique n'est prétendue traitée dans ce document : le rapport réel est celui de l'artefact CI.

## 4. Conduite à tenir en cas de nouvelle alerte

1. Lire l'artefact `trivy-<sha>` ou la sortie de `npm audit` dans les logs du job `security`.
2. Identifier la version affectée et la version corrigée.
3. Corriger (mise à jour du lockfile, de l'image de base) ou documenter la justification et la date de révision.
4. Rouvrir une PR : le pipeline rejoue tous les contrôles avant publication.
