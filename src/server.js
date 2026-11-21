const app = require('./app');
const { init } = require('./db');
const config = require('./config');
const logger = require('./logger');

async function start() {
  config.getJwtSecret(); // échoue tôt si le secret est absent
  await init();
  app.listen(config.port, () => {
    logger.info('server started', { port: config.port, version: config.version });
  });
}

start().catch((err) => {
  logger.error('startup failed', { error: err.message });
  process.exit(1);
});
