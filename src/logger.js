// Journalisation JSON minimale sur stdout (visible via `docker logs`).
function log(level, message, extra = {}) {
  console.log(
    JSON.stringify({ time: new Date().toISOString(), level, message, ...extra }),
  );
}

module.exports = {
  info: (m, e) => log('info', m, e),
  warn: (m, e) => log('warn', m, e),
  error: (m, e) => log('error', m, e),
};
