import { createApp } from './app';
import { ENV, validateEnv } from './config/env.config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';
import { Scheduler } from './scheduler/scheduler';

async function bootstrap() {
  try {
    validateEnv();
    logger.info('ðŸ”§ Environment configuration verified');

    await connectDatabase();

    const app = createApp();

    // Start background job scheduler
    Scheduler.start();

    const server = app.listen(ENV.PORT, () => {
      logger.info(`ðŸš€ Task Management Server running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
      logger.info(`ðŸ”— Base API URL: http://localhost:${ENV.PORT}/api/v1`);
      logger.info(`ðŸ©º Health Check: http://localhost:${ENV.PORT}/health`);
    });

    // Graceful Shutdown handling
    const handleShutdown = async (signal: string) => {
      logger.info(`ðŸ›‘ Received ${signal}. Starting graceful shutdown...`);
      Scheduler.stop();
      server.close(async () => {
        logger.info('ðŸ”’ HTTP server closed');
        await disconnectDatabase();
        logger.info('ðŸ‘‹ Graceful shutdown complete. Process exiting.');
        process.exit(0);
      });

      // Force shutdown after 10 seconds if hanging
      setTimeout(() => {
        logger.error('âš ï¸ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('ðŸ’¥ Fatal error during application startup:', error);
    process.exit(1);
  }
}

bootstrap();
