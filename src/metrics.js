// Indicateurs techniques minimaux, en mémoire, exposés via GET /metrics.
// L'objectif est la supervision légère, pas un système de métriques complet.

const startedAt = Date.now();
let requests = 0;
let errors = 0;
let totalDurationMs = 0;
const byStatus = {};

function middleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    requests += 1;
    totalDurationMs += duration;
    byStatus[res.statusCode] = (byStatus[res.statusCode] || 0) + 1;
    if (res.statusCode >= 500) errors += 1;
  });
  next();
}

function snapshot() {
  return {
    service: 'reclamations',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    requests,
    errors,
    averageResponseMs:
      requests === 0 ? 0 : Number((totalDurationMs / requests).toFixed(2)),
    byStatus: { ...byStatus },
  };
}

function reset() {
  requests = 0;
  errors = 0;
  totalDurationMs = 0;
  Object.keys(byStatus).forEach((key) => delete byStatus[key]);
}

module.exports = { middleware, snapshot, reset };
