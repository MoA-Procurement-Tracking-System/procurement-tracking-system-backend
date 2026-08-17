import pino from 'pino';
import { pinoHttp, type Options } from 'pino-http';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
  ],
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});

const httpOptions: Options = {
  logger,
  genReqId: (req) =>
    (req.headers['x-request-id'] as string) ?? crypto.randomUUID(),
  serializers: {
    req: (req: { method: string; url: string; id: string }) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
};

export const httpLogger = pinoHttp(httpOptions);
