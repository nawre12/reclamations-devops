// Toute la configuration vient des variables d'environnement.
module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/reclamations',
  version: process.env.APP_VERSION || 'dev',
  getJwtSecret() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET manquant');
    return process.env.JWT_SECRET;
  },
};
