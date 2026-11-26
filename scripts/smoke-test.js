#!/usr/bin/env node
'use strict';

// Smoke tests exécutés après chaque déploiement : santé, interface, indicateurs
// et cycle de vie minimal d'une réclamation. Sortie JSON exploitable en CI.

const BASE_URL = (
  process.env.SMOKE_BASE_URL ||
  process.env.APP_URL ||
  'http://127.0.0.1:3000'
).replace(/\/$/, '');
const EXPECTED_VERSION = process.env.EXPECTED_APP_VERSION;
const results = [];

async function call(name, path, options = {}) {
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error(`${name} : ${BASE_URL}${path} injoignable (${error.message})`);
  }
  const ms = Date.now() - startedAt;
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let body;
  if (!contentType.includes('json')) {
    body = text;
  } else {
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 200) };
    }
  }
  results.push({ name, status: response.status, ms });
  if (!response.ok) {
    throw new Error(`${name} : HTTP ${response.status} - ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const health = await call('health', '/health');
  if (health.status !== 'ok')
    throw new Error(`health invalide : ${JSON.stringify(health)}`);
  if (EXPECTED_VERSION && health.version !== EXPECTED_VERSION) {
    throw new Error(
      `version déployée inattendue : ${health.version} (attendu ${EXPECTED_VERSION})`,
    );
  }

  const page = await call('interface web', '/');
  if (!page.includes('Gestion des réclamations')) {
    throw new Error('l interface web ne contient pas le titre attendu');
  }

  const metrics = await call('indicateurs', '/metrics');
  if (typeof metrics.requests !== 'number') {
    throw new Error('les indicateurs ne contiennent pas de compteur de requêtes');
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const credentials = {
    email: `smoke-${suffix}@example.com`,
    password: 'motdepasse1',
  };
  await call('inscription', '/api/auth/register', {
    method: 'POST',
    body: credentials,
  });
  const login = await call('connexion', '/api/auth/login', {
    method: 'POST',
    body: credentials,
  });
  if (!login.token) throw new Error('la connexion na pas renvoyé de token');
  const headers = { Authorization: `Bearer ${login.token}` };

  const created = await call('création réclamation', '/api/reclamations', {
    method: 'POST',
    headers,
    body: { title: `Smoke ${suffix}`, description: 'Vérification automatique' },
  });
  const list = await call('liste des réclamations', '/api/reclamations', { headers });
  if (!Array.isArray(list) || !list.some((row) => row.id === created.id)) {
    throw new Error('la réclamation créée est absente de la liste');
  }
  await call('statut en_cours', `/api/reclamations/${created.id}/status`, {
    method: 'PATCH',
    headers,
    body: { status: 'en_cours' },
  });
  await call('statut resolue', `/api/reclamations/${created.id}/status`, {
    method: 'PATCH',
    headers,
    body: { status: 'resolue' },
  });

  console.log(
    JSON.stringify(
      { ok: true, baseUrl: BASE_URL, version: health.version, checks: results },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({ ok: false, error: error.message, checks: results }, null, 2),
  );
  process.exit(1);
});
