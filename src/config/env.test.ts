import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function configureMailerSend(values: {
  token: string;
  fromEmail: string;
  fromName: string;
}) {
  vi.stubEnv('MAILERSEND_API_TOKEN', values.token);
  vi.stubEnv('MAILERSEND_FROM_EMAIL', values.fromEmail);
  vi.stubEnv('MAILERSEND_FROM_NAME', values.fromName);
}

describe('MailerSend environment configuration', () => {
  it('accepts a complete MailerSend configuration', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    configureMailerSend({
      token: 'test-token',
      fromEmail: 'noreply@example.com',
      fromName: 'MoA Procurement Tracking System',
    });

    const { env } = await import('./env.js');

    expect(env.MAILERSEND_API_TOKEN).toBe('test-token');
  });

  it('rejects a partial MailerSend configuration', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    configureMailerSend({
      token: 'test-token',
      fromEmail: '',
      fromName: '',
    });

    await expect(import('./env.js')).rejects.toThrow(
      'MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, and MAILERSEND_FROM_NAME must be configured together',
    );
  });

  it('requires MailerSend in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    configureMailerSend({ token: '', fromEmail: '', fromName: '' });

    await expect(import('./env.js')).rejects.toThrow(
      'MailerSend configuration is required in production',
    );
  });
});
