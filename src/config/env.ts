import 'dotenv/config';
import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.email().optional(),
);

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://postgres:postgres@localhost:5433/procurement?schema=public',
    ),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_COOKIE_NAME: z.string().min(1).default('moa_session'),
  SESSION_HOURS: z.coerce.number().int().positive().default(8),
  REMEMBER_SESSION_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_CHANGE_SESSION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
  PASSWORD_RESET_MINUTES: z.coerce.number().int().positive().default(30),
  USER_INVITATION_HOURS: z.coerce.number().int().positive().default(72),
  TEMP_PASSWORD_HOURS: z.coerce.number().int().positive().default(72),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  PASSWORD_RESET_WEBHOOK_URL: optionalUrl,
  USER_INVITATION_WEBHOOK_URL: optionalUrl,
  MAILERSEND_API_TOKEN: optionalString,
  MAILERSEND_FROM_EMAIL: optionalEmail,
  MAILERSEND_FROM_NAME: optionalString,
  BOOTSTRAP_ADMIN_EMAIL: z.email().default('admin@moa.gov.et'),
  BOOTSTRAP_ADMIN_NAME: z.string().min(1).default('System Administrator'),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(result.error)}`,
  );
}

function get(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT) || 5000,
  get DATABASE_URL() {
    return get('DATABASE_URL');
  },
  get JWT_ACCESS_SECRET() {
    return get('JWT_ACCESS_SECRET');
  },
  get JWT_REFRESH_SECRET() {
    return get('JWT_REFRESH_SECRET');
  },
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3001',
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_WINDOW_MS:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
};