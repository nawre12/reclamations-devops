#!/usr/bin/env node
'use strict';

// Contrôle DevSecOps minimal : détection de secrets dans les fichiers versionnés.
// Complète `npm audit` (dépendances) et Trivy (image). Aucun secret réel ne doit
// apparaître dans le dépôt, y compris dans un exemple ou une capture.

const fs = require('fs');
const { execFileSync } = require('child_process');

const patterns = [
  { name: 'clé privée', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'jeton GitHub classique', regex: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'jeton GitHub fin', regex: /github_pat_[A-Za-z0-9_]{30,}/ },
  { name: 'clé AWS', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'jeton Slack', regex: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  {
    name: 'JWT signé',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
];

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const findings = [];

for (const file of files) {
  if (/(^|\/)\.env$/.test(file) && !/(^|\/)\.env\..*example$/.test(file)) {
    findings.push({ file, line: 0, reason: 'fichier .env versionné' });
    continue;
  }
  if (/\.(png|jpe?g|gif|ico|pdf|lock)$/i.test(file)) continue;

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  content.split(/\r?\n/).forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push({ file, line: index + 1, reason: pattern.name });
      }
    }
  });
}

if (findings.length > 0) {
  console.error(
    JSON.stringify(
      { ok: false, message: 'Secrets potentiels détectés', findings },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    { ok: true, filesScanned: files.length, patterns: patterns.map((p) => p.name) },
    null,
    2,
  ),
);
