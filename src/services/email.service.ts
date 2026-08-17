import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import nodemailer from 'nodemailer';

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

export function isSmtpConfigured(): boolean {
  // Assuming environment variables like SMTP_HOST exist, though not explicitly validated in env.ts yet
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export async function sendEmail(message: TransactionalEmail): Promise<void> {
  // 1. Try SMTP / Nodemailer first
  if (isSmtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MoA Procurement" <no-reply@moa.gov.et>',
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
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
    return;
  }

  // 3. Fallback to Ethereal Mail for local development
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
    });

    logger.info(`Test Email Sent: ${nodemailer.getTestMessageUrl(info)}`);
    return;
  }

  throw new Error('No email provider is configured. Cannot send email.');
}
