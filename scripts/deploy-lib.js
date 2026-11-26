'use strict';

// Fonctions partagées par les scripts de déploiement, rollback et incident.
// Les états sont stockés dans state/ (non versionné) pour garder une trace de
// la version courante et permettre un retour arrière reproductible.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STATE_DIR = path.join(ROOT, 'state');
const CURRENT_FILE = path.join(STATE_DIR, 'deployment.json');
const HISTORY_FILE = path.join(STATE_DIR, 'deployment-history.json');
const COMPOSE_FILE = 'docker-compose.test.yml';
const PROJECT = 'reclamations-test';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} a échoué (code ${result.status})${
        options.capture ? ` : ${result.stderr || result.stdout}` : ''
      }`,
    );
  }
  return result.stdout || '';
}

function compose(args, options = {}) {
  return run('docker', ['compose', '-p', PROJECT, '-f', COMPOSE_FILE, ...args], options);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSmoke(baseUrl, attempts = 20, delayMs = 2000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'smoke-test.js')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, SMOKE_BASE_URL: baseUrl },
    });
    if (result.status === 0) return result.stdout;
    if (attempt === attempts) {
      throw new Error(
        `smoke tests en échec après ${attempts} tentatives : ${result.stderr || result.stdout}`,
      );
    }
    process.stdout.write(
      `Smoke tests pas encore prêts (${attempt}/${attempts}), nouvelle tentative...\n`,
    );
    await sleep(delayMs);
  }
  return '';
}

function versionFromImage(image) {
  const tag = image.split('/').pop();
  return tag.includes(':') ? tag.slice(tag.lastIndexOf(':') + 1) : 'latest';
}

function recordDeployment({ image, version, mode, dryRun }) {
  const previous = readJson(CURRENT_FILE, null);
  const entry = {
    version,
    image,
    mode,
    status: dryRun ? 'dry-run' : 'success',
    deployedAt: new Date().toISOString(),
  };
  const history = readJson(HISTORY_FILE, []);
  writeJson(HISTORY_FILE, [...history, entry].slice(-20));
  writeJson(CURRENT_FILE, {
    ...entry,
    previousVersion: previous && previous.version !== version ? previous.version : null,
    previousImage: previous && previous.image !== image ? previous.image : null,
  });
  return entry;
}

async function deploy({
  image,
  version = versionFromImage(image),
  mode = 'deploy',
  dryRun = false,
  baseUrl = 'http://127.0.0.1:3001',
  pull = true,
}) {
  if (!image) throw new Error('image manquante (--image= ou variable IMAGE)');

  if (dryRun) {
    const entry = recordDeployment({ image, version, mode, dryRun: true });
    return { ...entry, note: 'mode simulation : aucune commande Docker exécutée' };
  }

  if (pull) {
    if (image.includes('/')) {
      compose(['pull', 'app']);
    } else {
      compose(['build', 'app']);
    }
  }
  compose(['up', '-d', 'app']);
  const smokeOutput = await waitForSmoke(baseUrl);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'smoke-result.json'), smokeOutput, 'utf8');
  const entry = recordDeployment({ image, version, mode, dryRun: false });
  return { ...entry, smokeOutput };
}

module.exports = {
  ROOT,
  STATE_DIR,
  CURRENT_FILE,
  HISTORY_FILE,
  readJson,
  writeJson,
  run,
  compose,
  deploy,
  recordDeployment,
  versionFromImage,
};
