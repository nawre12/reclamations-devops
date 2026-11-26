#!/usr/bin/env node
'use strict';

// Retour arrière vers la dernière version stable enregistrée.
// Usage : node scripts/rollback.js [--version=...] [--image=...] [--dry-run]

const {
  deploy,
  versionFromImage,
  readJson,
  CURRENT_FILE,
  HISTORY_FILE,
} = require('./deploy-lib');

function argument(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const current = readJson(CURRENT_FILE, null);
const history = readJson(HISTORY_FILE, []);
const requestedImage =
  argument('image', process.env.ROLLBACK_IMAGE || '') ||
  (current && current.previousImage) ||
  '';
const requestedVersion = argument('version', process.env.ROLLBACK_VERSION || '');

let target;
if (requestedImage) {
  target = {
    image: requestedImage,
    version: requestedVersion || versionFromImage(requestedImage),
  };
} else {
  const currentIndex = history.findIndex((entry) => entry.version === current?.version);
  const candidates = history.filter(
    (entry) =>
      entry.version && entry.version !== current?.version && entry.status !== 'dry-run',
  );
  target =
    currentIndex > 0 ? history[currentIndex - 1] : candidates[candidates.length - 1];
}

if (!target) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error:
          'Aucune version stable précédente trouvée. Indiquer --image= et --version= manuellement.',
        current,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const baseUrl = argument(
  'base-url',
  process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001',
);

deploy({
  image: target.image,
  version: requestedVersion || target.version,
  mode: 'rollback',
  dryRun,
  baseUrl,
})
  .then((result) => {
    console.log(
      JSON.stringify({ ok: true, from: current?.version || null, ...result }, null, 2),
    );
  })
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  });
