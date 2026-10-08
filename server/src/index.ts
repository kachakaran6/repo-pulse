import { app } from './app.js';
import { env } from './config/env.js';
import { initDb } from './db/index.js';
import { logger } from './utils/logger.js';

async function start() {
  await initDb();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`RepoPulse v2 API listening on 0.0.0.0:${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`Health check available at http://localhost:${env.PORT}/healthz`);
  });

  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error({ error: err.message }, 'Failed to start server');
  process.exit(1);
});
