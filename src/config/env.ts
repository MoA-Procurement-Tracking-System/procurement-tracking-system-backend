import 'dotenv/config';
import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().email().optional(),
);

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    DATABASE_URL: z
      .string()
      .min(1)
      .default(
        'postgresql://postgres:postgres@localhost:5432/procurement_tracking?schema=public',
      ),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:3000,http://localhost:3001'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    LOG_LEVEL: z.string().default('info'),
    JWT_ACCESS_SECRET: z
      .string()
      .default('default_access_secret_change_in_production'),
    JWT_REFRESH_SECRET: z
      .string()
      .default('default_refresh_secret_change_in_production'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
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
    SMTP_HOST: optionalString,
    SMTP_PORT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.coerce.number().int().positive().optional(),
    ),
    SMTP_SECURE: z.preprocess(
      (value) =>
        value === 'true' || value === true
          ? true
          : value === 'false' || value === false
            ? false
            : undefined,
      z.boolean().optional(),
    ),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    SMTP_FROM: optionalString,
    BREVO_API_KEY: optionalString,
    BREVO_FROM_EMAIL: optionalEmail,
    BREVO_FROM_NAME: optionalString,
    MAILERSEND_API_TOKEN: optionalString,
    MAILERSEND_FROM_EMAIL: optionalEmail,
    MAILERSEND_FROM_NAME: optionalString,
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().default('admin@moa.gov.et'),
    BOOTSTRAP_ADMIN_NAME: z.string().min(1).default('System Administrator'),
    BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
    BOOTSTRAP_DIRECTOR_EMAIL: optionalEmail,
    BOOTSTRAP_DIRECTOR_NAME: optionalString,
    BOOTSTRAP_DIRECTOR_PASSWORD: z.string().optional(),
    // Backup configuration
    // Set BACKUP_ENABLED=true on the production server to activate the monthly cron job.
    // Set BACKUP_REMOTE_PATH to the mounted share path or rsync target once IT confirms.
    BACKUP_ENABLED: z
      .preprocess((v) => v === 'true' || v === '1', z.boolean())
      .default(false),
    BACKUP_REMOTE_PATH: optionalString,
  })
  .superRefine((values, context) => {
    const brevoValues = [
      values.BREVO_API_KEY,
      values.BREVO_FROM_EMAIL,
      values.BREVO_FROM_NAME,
    ];
    const configuredBrevo = brevoValues.filter(Boolean).length;
    if (configuredBrevo > 0 && configuredBrevo < brevoValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['BREVO_API_KEY'],
        message:
          'BREVO_API_KEY, BREVO_FROM_EMAIL, and BREVO_FROM_NAME must be configured together',
      });
    }

    const mailerSendValues = [
      values.MAILERSEND_API_TOKEN,
      values.MAILERSEND_FROM_EMAIL,
      values.MAILERSEND_FROM_NAME,
    ];
    const configuredMailerSend = mailerSendValues.filter(Boolean).length;
    if (
      configuredMailerSend > 0 &&
      configuredMailerSend < mailerSendValues.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['MAILERSEND_API_TOKEN'],
        message:
          'MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, and MAILERSEND_FROM_NAME must be configured together',
      });
    }

    const hasSmtp = Boolean(
      values.SMTP_HOST && values.SMTP_USER && values.SMTP_PASS,
    );
    if (
      values.NODE_ENV === 'production' &&
      configuredBrevo === 0 &&
      configuredMailerSend === 0 &&
      !hasSmtp
    ) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message:
          'An email provider (SMTP, Brevo, or MailerSend) configuration is required in production',
      });
    }
  });

const result = schema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(result.error)}`,
  );
}

export const env = result.data;
