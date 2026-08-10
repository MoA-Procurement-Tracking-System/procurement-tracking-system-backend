import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: required('DATABASE_URL'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3001',
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW_MS:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
};
