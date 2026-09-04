import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import nodemailer from 'nodemailer';

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function isBrevoConfigured(): boolean {
  return Boolean(
    env.BREVO_API_KEY && env.BREVO_FROM_EMAIL && env.BREVO_FROM_NAME,
  );
}

export function isMailerSendConfigured(): boolean {
  return Boolean(
    env.MAILERSEND_API_TOKEN &&
    env.MAILERSEND_FROM_EMAIL &&
    env.MAILERSEND_FROM_NAME,
  );
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendEmail(message: TransactionalEmail): Promise<void> {
  // 1. Try Brevo API first
  if (isBrevoConfigured()) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_FROM_EMAIL,
          name: env.BREVO_FROM_NAME,
        },
        to: [
          {
            email: message.to,
          },
        ],
        subject: message.subject,
        textContent: message.text,
        ...(message.html ? { htmlContent: message.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Brevo returned HTTP ${response.status}: ${responseText}`,
      );
    }

    logger.info(
      { to: message.to, subject: message.subject },
      'Email sent successfully via Brevo',
    );

    return;
  }

  // 2. Try MailerSend REST API
  if (isMailerSendConfigured()) {
    const apiToken = env.MAILERSEND_API_TOKEN;
    const fromEmail = env.MAILERSEND_FROM_EMAIL;
    const fromName = env.MAILERSEND_FROM_NAME;

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
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 500);

      let providerMessage = responseText;

      try {
        const payload = JSON.parse(responseText) as {
          message?: unknown;
        };

        providerMessage =
          typeof payload.message === 'string' ? payload.message : responseText;
      } catch {
        // Keep the plain-text response.
      }

      throw new Error(
        `MailerSend returned HTTP ${response.status}${
          providerMessage ? `: ${providerMessage}` : ''
        }`,
      );
    }

    logger.info(
      { to: message.to, subject: message.subject },
      'Email sent successfully via MailerSend',
    );

    return;
  }

  // 3. Try SMTP / Nodemailer
  if (isSmtpConfigured()) {
    const port = env.SMTP_PORT ?? 587;
    const secure = env.SMTP_SECURE ?? port === 465;
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure,
      family: 4,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS?.replace(/\s+/g, ''),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await transporter.sendMail({
      from:
        env.SMTP_FROM || `"MoA Procurement Tracking System" <${env.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
    logger.info(
      { to: message.to, subject: message.subject },
      'Email sent successfully via SMTP',
    );
    return;
  }

  // 4. Fallback to Ethereal for local development
  if (env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Test MoA Procurement" <test@example.com>',
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });

    logger.info(`Test Email Sent: ${nodemailer.getTestMessageUrl(info)}`);

    return;
  }

  throw new Error('No email provider is configured. Cannot send email.');
}
