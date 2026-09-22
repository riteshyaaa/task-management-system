import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/task_management_db?schema=public',

  // JWT Configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_key_32_bytes_long_minimum',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_32_bytes_long_minimum',
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
  JWT_REFRESH_EXPIRATION_DAYS: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10),

  // Security & Rate Limiting
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? '10000' : '2000'), 10),

  // Background Jobs
  RECURRING_TASK_CRON: process.env.RECURRING_TASK_CRON || '*/5 * * * *', // every 5 mins
  AUDIT_RETENTION_CRON: process.env.AUDIT_RETENTION_CRON || '0 2 * * *' // 2am daily
} as const;

export function validateEnv(): void {
  const requiredInProduction = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  if (ENV.NODE_ENV === 'production') {
    for (const key of requiredInProduction) {
      if (!process.env[key]) {
        throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable ${key} in production mode.`);
      }
    }
  }
}
