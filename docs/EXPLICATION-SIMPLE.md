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

## 4. Ce que je montre sur GitHub

Ouvre l’onglet **Actions** :

1. `Qualité` : formatage et lint verts.
2. `Tests unitaires` et `Tests API + couverture` : 21 tests verts.
3. `Sécurité` : audit npm et détection de secrets verts.
4. `Artefact versionné` : l’archive du code est téléchargeable.
5. `Image Docker + scan Trivy` : l’image est scannée puis publiée.
6. `Déploiement test + smoke tests` : l’application est démarrée et vérifiée.

Dans **Packages**, montre le tag `sha-<commit>` : c’est la version exacte du code.

Dans l’artefact `preuves-deploiement-<sha>`, montre `smoke-result.json` : c’est la preuve que ça marche après déploiement.

## 5. Les phrases à dire

- « Je change une ligne visible, je pousse, et le pipeline se déclenche tout seul. »
- « Si un test échoue, rien n’est publié : c’est le quality gate. »
- « L’image porte le numéro du commit, donc on peut revenir à cette version. »
- « Les smoke tests vérifient la santé, la page, les indicateurs et une réclamation complète. »
- « Les scripts locaux sont en `dry-run`; le vrai déploiement est dans GitHub Actions. »

## 6. Ce qu’il ne faut pas dire

- « J’ai déployé sur un serveur public permanent. » → Non : l’environnement de test est éphémère dans la CI.
- « J’ai utilisé Kubernetes. » → Non : Docker Compose suffit et le PDF l’autorise.
- « J’ai mis les secrets dans le dépôt. » → Non : ils viennent des variables d’environnement / secrets GitHub.

## 7. Si on me demande « mais concrètement, tu as changé quoi ? »

Réponse courte :

> « J’ai changé le texte affiché dans `public/index.html`. Ce commit a fait tourner le pipeline : tests verts, image `sha-...`, déploiement en test et smoke tests verts. Voilà l’exécution. »

## 8. Les autres documents

- `GUIDE-PROJET.md` : le projet en détail.
- `SCENARIO-DEMO.md` : le pas-à-pas complet.
- `PIPELINE.md` : les 7 jobs expliqués.
- `BILAN.md` : ce qui est fait et les limites.
