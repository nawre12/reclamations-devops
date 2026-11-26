#!/usr/bin/env node
'use strict';

// Simulation contrôlée d'un incident dans l'environnement de test.
// Par défaut : arrêt du service PostgreSQL, puis tentative de smoke tests et
// collecte des journaux. Le rollback reste une étape séparée (rollback.js).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { STATE_DIR, compose, run, writeJson } = require('./deploy-lib');

function argument(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const type = argument('type', process.env.INCIDENT_TYPE || 'database-indisponible');
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const id = `incident-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const baseUrl = argument(
  'base-url',
  process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001',
);

const record = {
  id,
  type,
  startedAt: new Date().toISOString(),
  mode: dryRun ? 'dry-run' : 'réel (environnement de test)',
  scenario:
    type === 'database-indisponible'
      ? 'Arrêt du conteneur PostgreSQL : /health doit répondre 503 et les smoke tests doivent échouer.'
      : `Incident simulé : ${type}`,
  steps: [
    'Arrêter la base de test (ou injecter une configuration erronée).',
    'Lancer les smoke tests et constater l’échec.',
    'Consulter les journaux applicatifs (logs JSON) pour identifier la cause.',
    'Restaurer le service puis exécuter la procédure de rollback si nécessaire.',
  ],
};

try {
  if (!dryRun) {
    compose(['stop', 'db']);
    const smoke = spawnSync(process.execPath, [path.join(__dirname, 'smoke-test.js')], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      env: { ...process.env, SMOKE_BASE_URL: baseUrl },
    });
    record.smokeExitCode = smoke.status;
    record.observation = (smoke.stderr || smoke.stdout || '').slice(0, 4000);
    const logs = run(
      'docker',
      [
        'compose',
        '-p',
        'reclamations-test',
        '-f',
        'docker-compose.test.yml',
        'logs',
        '--tail',
        '150',
      ],
      { capture: true },
    );
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'incident-logs.txt'), logs, 'utf8');
    record.logsFile = 'state/incident-logs.txt';
  }

  fs.mkdirSync(path.join(STATE_DIR, 'incidents'), { recursive: true });
  writeJson(path.join(STATE_DIR, 'incidents', `${id}.json`), record);
  console.log(JSON.stringify({ ok: true, ...record }, null, 2));
} catch (error) {
  record.error = error.message;
  fs.mkdirSync(path.join(STATE_DIR, 'incidents'), { recursive: true });
  writeJson(path.join(STATE_DIR, 'incidents', `${id}.json`), record);
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
