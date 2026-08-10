import { env } from '../config/env.js';

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
};

export function isMailerSendConfigured(): boolean {
  return Boolean(
    env.MAILERSEND_API_TOKEN &&
    env.MAILERSEND_FROM_EMAIL &&
    env.MAILERSEND_FROM_NAME,
  );
}

export async function sendEmail(message: TransactionalEmail): Promise<void> {
  const apiToken = env.MAILERSEND_API_TOKEN;
  const fromEmail = env.MAILERSEND_FROM_EMAIL;
  const fromName = env.MAILERSEND_FROM_NAME;

  if (!apiToken || !fromEmail || !fromName) {
    throw new Error(
      'MailerSend requires MAILERSEND_API_TOKEN, MAILERSEND_FROM_EMAIL, and MAILERSEND_FROM_NAME',
    );
  }

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: message.to }],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseText = (await response.text()).slice(0, 500);
    let providerMessage = responseText;
    try {
      const payload = JSON.parse(responseText) as { message?: unknown };
      providerMessage =
        typeof payload.message === 'string' ? payload.message : responseText;
    } catch {
      // Keep MailerSend's plain-text response when it is not JSON.
    }

    throw new Error(
      `MailerSend returned HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : ''}`,
    );
  }
}
