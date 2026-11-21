// Valeurs de TEST uniquement (aucun secret réel)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/reclamations_test';
