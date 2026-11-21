# Gestion des réclamations

API Node.js/Express + PostgreSQL, support du mini-projet DevOps.

## Lancer en local

```bash
cp .env.example .env        # puis adapter les valeurs
npm install
npm start                   # nécessite un PostgreSQL accessible via DATABASE_URL
```

## Endpoints

| Méthode | Route                        | Description                               |
| ------- | ---------------------------- | ----------------------------------------- |
| GET     | /health                      | Sonde de santé (teste la base)            |
| POST    | /api/auth/register           | Inscription `{email, password}`           |
| POST    | /api/auth/login              | Connexion, renvoie `{token}`              |
| POST    | /api/reclamations            | Créer `{title, description}`              |
| GET     | /api/reclamations            | Lister mes réclamations                   |
| GET     | /api/reclamations/:id        | Détail                                    |
| PATCH   | /api/reclamations/:id/status | `{status}` : ouverte → en_cours → resolue |

## Qualité

```bash
npm run lint
npm run format:check
npm run test:unit
npm test                    # unitaires + intégration + couverture (base de test requise)
```
