import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'authorization',
      'cookie',
      'token',
      'secret',
      'key',
      'password',
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-hub-signature-256"]',
      'res.headers["set-cookie"]',
      'session.token',
      'github_token',
      'app_private_key',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
