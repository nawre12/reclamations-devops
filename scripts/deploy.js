#!/usr/bin/env node
'use strict';

// Déploiement de l'image versionnée dans l'environnement de test.
// Usage : node scripts/deploy.js [--image=...] [--version=...] [--dry-run]

const { deploy, versionFromImage } = require('./deploy-lib');

function argument(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const image = argument('image', process.env.IMAGE || 'reclamations:test');
const version = argument(
  'version',
  process.env.APP_VERSION || process.env.EXPECTED_APP_VERSION || versionFromImage(image),
);
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const baseUrl = argument(
  'base-url',
  process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001',
);
const pull = !process.argv.includes('--no-pull') && process.env.PULL_IMAGE !== '0';

deploy({ image, version, mode: 'deploy', dryRun, baseUrl, pull })
  .then((result) => {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  });
