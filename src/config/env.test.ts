import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function configureBrevo(values: {
  key: string;
  fromEmail: string;
  fromName: string;
}) {
  vi.stubEnv('BREVO_API_KEY', values.key);
  vi.stubEnv('BREVO_FROM_EMAIL', values.fromEmail);
  vi.stubEnv('BREVO_FROM_NAME', values.fromName);
}

function configureMailerSend(values: {
  token: string;
  fromEmail: string;
  fromName: string;
}) {
  vi.stubEnv('MAILERSEND_API_TOKEN', values.token);
  vi.stubEnv('MAILERSEND_FROM_EMAIL', values.fromEmail);
  vi.stubEnv('MAILERSEND_FROM_NAME', values.fromName);
}

function configureSmtp(values: {
  host?: string;
  user?: string;
  pass?: string;
}) {
  vi.stubEnv('SMTP_HOST', values.host ?? '');
  vi.stubEnv('SMTP_USER', values.user ?? '');
  vi.stubEnv('SMTP_PASS', values.pass ?? '');
}

describe('Email provider environment configuration', () => {
  it('accepts a complete Brevo configuration', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    configureSmtp({ host: '', user: '', pass: '' });
    configureMailerSend({ token: '', fromEmail: '', fromName: '' });
    configureBrevo({
      key: 'test-key',
      fromEmail: 'noreply@example.com',
      fromName: 'MoA Procurement Tracking System',
    });

    const { env } = await import('./env.js');

    expect(env.BREVO_API_KEY).toBe('test-key');
  });

  it('accepts a complete MailerSend configuration', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    configureSmtp({ host: '', user: '', pass: '' });
    configureBrevo({ key: '', fromEmail: '', fromName: '' });
    configureMailerSend({
      token: 'test-token',
      fromEmail: 'noreply@example.com',
      fromName: 'MoA Procurement Tracking System',
    });

    const { env } = await import('./env.js');

    expect(env.MAILERSEND_API_TOKEN).toBe('test-token');
  });

  it('accepts a complete SMTP configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    configureBrevo({ key: '', fromEmail: '', fromName: '' });
    configureMailerSend({ token: '', fromEmail: '', fromName: '' });
    configureSmtp({
      host: 'smtp.gmail.com',
      user: 'test@gmail.com',
      pass: 'testpass',
    });

    const { env } = await import('./env.js');

    expect(env.SMTP_HOST).toBe('smtp.gmail.com');
  });

  it('rejects a partial MailerSend configuration', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    configureSmtp({ host: '', user: '', pass: '' });
    configureBrevo({ key: '', fromEmail: '', fromName: '' });
    configureMailerSend({
      token: 'test-token',
      fromEmail: '',
      fromName: '',
    });

    await expect(import('./env.js')).rejects.toThrow(
      'MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, and MAILERSEND_FROM_NAME must be configured together',
    );
  });

  it('requires an email provider in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    configureBrevo({ key: '', fromEmail: '', fromName: '' });
    configureMailerSend({ token: '', fromEmail: '', fromName: '' });
    configureSmtp({ host: '', user: '', pass: '' });

    await expect(import('./env.js')).rejects.toThrow(
      'An email provider (SMTP, Brevo, or MailerSend) configuration is required in production',
    );
  });
});
