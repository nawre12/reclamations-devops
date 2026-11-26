const request = require('supertest');
const app = require('../../src/app');
const { pool, init } = require('../../src/db');
// Crée un utilisateur et renvoie son en-tête d'authentification
async function registerAndLogin(email) {
  const password = 'motdepasse1';
  await request(app).post('/api/auth/register').send({ email, password });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { Authorization: `Bearer ${res.body.token}` };
}
beforeAll(async () => {
  await init();
  await pool.query('TRUNCATE reclamations, users RESTART IDENTITY CASCADE');
});
afterAll(async () => {
  await pool.end();
});
describe('validation et erreurs', () => {
  test('inscription refusée si données invalides', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
  });
  test('token invalide refusé', async () => {
    const res = await request(app)
      .get('/api/reclamations')
      .set({ Authorization: 'Bearer faux.token.ici' });
    expect(res.status).toBe(401);
  });
  test('création refusée sans titre', async () => {
    const auth = await registerAndLogin('user1@example.com');
    const res = await request(app)
      .post('/api/reclamations')
      .set(auth)
      .send({ description: 'sans titre' });
    expect(res.status).toBe(400);
  });
  test('lecture d une réclamation par id', async () => {
    const auth = await registerAndLogin('user2@example.com');
    const created = await request(app)
      .post('/api/reclamations')
      .set(auth)
      .send({ title: 'Projecteur', description: 'Salle A1' });
    const res = await request(app).get(`/api/reclamations/${created.body.id}`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Projecteur');
  });
  test('réclamation inexistante : 404', async () => {
    const auth = await registerAndLogin('user3@example.com');
    const res = await request(app).get('/api/reclamations/99999').set(auth);
    expect(res.status).toBe(404);
  });
  test('un utilisateur ne voit pas les réclamations des autres', async () => {
    const authA = await registerAndLogin('user4@example.com');
    const authB = await registerAndLogin('user5@example.com');
    const created = await request(app)
      .post('/api/reclamations')
      .set(authA)
      .send({ title: 'Privée', description: 'Test isolation' });
    const res = await request(app).get(`/api/reclamations/${created.body.id}`).set(authB);
    expect(res.status).toBe(404);
  });
  test('statut invalide : 400', async () => {
    const auth = await registerAndLogin('user6@example.com');
    const created = await request(app)
      .post('/api/reclamations')
      .set(auth)
      .send({ title: 'Test', description: 'Statut' });
    const res = await request(app)
      .patch(`/api/reclamations/${created.body.id}/status`)
      .set(auth)
      .send({ status: 'nimporte' });
    expect(res.status).toBe(400);
  });
  test('changement de statut sur réclamation inexistante : 404', async () => {
    const auth = await registerAndLogin('user7@example.com');
    const res = await request(app)
      .patch('/api/reclamations/99999/status')
      .set(auth)
      .send({ status: 'en_cours' });
    expect(res.status).toBe(404);
  });
});
