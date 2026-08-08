import 'dotenv/config';
import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
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
  TEMP_PASSWORD_HOURS: z.coerce.number().int().positive().default(72),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  PASSWORD_RESET_WEBHOOK_URL: optionalUrl,
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

export const env = result.data;
