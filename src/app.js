const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { signToken, requireAuth } = require('./auth');
const { isValidStatus, canTransition } = require('./status');
const config = require('./config');
const logger = require('./logger');

const app = express();
app.use(express.json());

// Log de chaque requête (méthode, chemin, code, durée)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});

// Sonde de santé : vérifie aussi la base de données
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', version: config.version });
  } catch (err) {
    logger.error('health check failed', { error: err.message });
    res.status(503).json({ status: 'down', version: config.version });
  }
});

// --- Authentification ---
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || password.length < 6) {
      return res
        .status(400)
        .json({ error: 'email et mot de passe (6+ caractères) requis' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Email déjà utilisé' });
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    res.json({ token: signToken(user) });
  } catch (err) {
    next(err);
  }
});

// --- Réclamations ---
app.post('/api/reclamations', requireAuth, async (req, res, next) => {
  try {
    const { title, description } = req.body || {};
    if (!title || !description) {
      return res.status(400).json({ error: 'title et description requis' });
    }
    const { rows } = await pool.query(
      'INSERT INTO reclamations (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [title, description, req.user.id],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get('/api/reclamations', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reclamations WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/reclamations/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reclamations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Réclamation introuvable' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/reclamations/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!isValidStatus(status)) return res.status(400).json({ error: 'Statut invalide' });
    const found = await pool.query(
      'SELECT * FROM reclamations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );
    const current = found.rows[0];
    if (!current) return res.status(404).json({ error: 'Réclamation introuvable' });
    if (!canTransition(current.status, status)) {
      return res
        .status(409)
        .json({ error: `Transition ${current.status} -> ${status} interdite` });
    }
    const { rows } = await pool.query(
      'UPDATE reclamations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, current.id],
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Gestionnaire d'erreurs global
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('unhandled error', { error: err.message });
  res.status(500).json({ error: 'Erreur interne' });
});

module.exports = app;
