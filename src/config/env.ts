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
    BOOTSTRAP_DIRECTOR_EMAIL: optionalEmail,
    BOOTSTRAP_DIRECTOR_NAME: optionalString,
    BOOTSTRAP_DIRECTOR_PASSWORD: z.string().optional(),
  })
  .superRefine((values, context) => {
    const mailerSendValues = [
      values.MAILERSEND_API_TOKEN,
      values.MAILERSEND_FROM_EMAIL,
      values.MAILERSEND_FROM_NAME,
    ];
    const configuredValues = mailerSendValues.filter(Boolean).length;

    if (configuredValues > 0 && configuredValues < mailerSendValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['MAILERSEND_API_TOKEN'],
        message:
          'MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, and MAILERSEND_FROM_NAME must be configured together',
      });
    }

    if (values.NODE_ENV === 'production' && configuredValues === 0) {
      context.addIssue({
        code: 'custom',
        path: ['MAILERSEND_API_TOKEN'],
        message: 'MailerSend configuration is required in production',
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
