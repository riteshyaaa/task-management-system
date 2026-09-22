import { createApp } from './app';
import { ENV, validateEnv } from './config/env.config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';
import { Scheduler } from './scheduler/scheduler';

async function bootstrap() {
  try {
    validateEnv();
    logger.info('[CONFIG] Environment configuration verified');

    await connectDatabase();

    const app = createApp();

    // Start background job scheduler
    Scheduler.start();

    const server = app.listen(ENV.PORT, () => {
      logger.info(`[SERVER] Task Management Server running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
      logger.info(`[API] Base API URL: http://localhost:${ENV.PORT}/api/v1`);
      logger.info(`[HEALTH] Health Check: http://localhost:${ENV.PORT}/health`);
    });

    // Graceful Shutdown handling
    const handleShutdown = async (signal: string) => {
      logger.info(`[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
      Scheduler.stop();
      server.close(async () => {
        logger.info('[SERVER] HTTP server closed');
        await disconnectDatabase();
        logger.info('[SHUTDOWN] Graceful shutdown complete. Process exiting.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if hanging
      setTimeout(() => {
        logger.error('[SHUTDOWN] Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('[FATAL] Fatal error during application startup:', error);
    process.exit(1);
  }
}

bootstrap();
