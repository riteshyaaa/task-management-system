import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { ENV } from './env.config';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      ENV.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' }
          ]
        : [{ emit: 'stdout', level: 'error' }]
  });

if (ENV.NODE_ENV === 'development') {
  global.prisma = prisma;

  // Optional query logger in dev mode
  (prisma as any).$on?.('query', (e: any) => {
    logger.debug(`Prisma Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('âœ… PostgreSQL connected successfully via Prisma');
  } catch (error) {
    logger.error('âŒ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('ðŸ”Œ PostgreSQL connection closed');
}
