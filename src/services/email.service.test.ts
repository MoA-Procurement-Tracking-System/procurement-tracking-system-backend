import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: {
    MAILERSEND_API_TOKEN: 'test-token',
    MAILERSEND_FROM_EMAIL: 'noreply@example.com',
    MAILERSEND_FROM_NAME: 'MoA Procurement Tracking System',
  },
}));

import { sendEmail } from './email.service.js';

describe('MailerSend email service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits a transactional email to MailerSend', async () => {
    let authorization = '';
    let requestBody: unknown;
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockImplementation(async (_input, init) => {
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      requestBody = JSON.parse(String(init?.body));
      return new Response(null, { status: 202 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendEmail({
      to: 'officer@example.com',
      subject: 'Account invitation',
      text: 'Open the secure invitation link.',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://api.mailersend.com/v1/email',
    );
    expect(authorization).toBe('Bearer test-token');
    expect(requestBody).toEqual({
      from: {
        email: 'noreply@example.com',
        name: 'MoA Procurement Tracking System',
      },
      to: [{ email: 'officer@example.com' }],
      subject: 'Account invitation',
      text: 'Open the secure invitation link.',
    });
  });

  it('rejects when MailerSend does not accept the email', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { message: 'The sender domain must be verified.' },
          { status: 422 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendEmail({
        to: 'officer@example.com',
        subject: 'Account invitation',
        text: 'Open the secure invitation link.',
      }),
    ).rejects.toThrow(
      'MailerSend returned HTTP 422: The sender domain must be verified.',
    );
  });
});
