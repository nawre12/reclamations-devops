const request = require('supertest');
const app = require('../../src/app');
const { pool, init } = require('../../src/db');

const creds = { email: 'etudiant@example.com', password: 'motdepasse1' };
let token;

beforeAll(async () => {
  await init();
  await pool.query('TRUNCATE reclamations, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('API réclamations', () => {
  test('GET /health répond ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('inscription puis connexion', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    expect(reg.status).toBe(201);
    const dup = await request(app).post('/api/auth/register').send(creds);
    expect(dup.status).toBe(409);
    const login = await request(app).post('/api/auth/login').send(creds);
    expect(login.status).toBe(200);
    token = login.body.token;
  });

  test('refuse un mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'faux' });
    expect(res.status).toBe(401);
  });

  test('refuse l accès sans token', async () => {
    const res = await request(app).get('/api/reclamations');
    expect(res.status).toBe(401);
  });

  test('cycle de vie d une réclamation', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app)
      .post('/api/reclamations')
      .set(auth)
      .send({ title: 'Wifi en panne', description: 'Salle B12' });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('ouverte');
    const id = created.body.id;

    const skip = await request(app)
      .patch(`/api/reclamations/${id}/status`)
      .set(auth)
      .send({ status: 'resolue' });
    expect(skip.status).toBe(409);

    const step1 = await request(app)
      .patch(`/api/reclamations/${id}/status`)
      .set(auth)
      .send({ status: 'en_cours' });
    expect(step1.body.status).toBe('en_cours');

    const step2 = await request(app)
      .patch(`/api/reclamations/${id}/status`)
      .set(auth)
      .send({ status: 'resolue' });
    expect(step2.body.status).toBe('resolue');

    const list = await request(app).get('/api/reclamations').set(auth);
    expect(list.body).toHaveLength(1);
  });
});
