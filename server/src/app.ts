import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env.js';
import { csrfProtection, apiRateLimiter } from './auth/middleware.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { reposRouter } from './routes/repos.js';
import { syncRouter } from './routes/sync.js';
import { settingsRouter } from './routes/settings.js';
import { shareRouter } from './routes/share.js';
import { webhooksRouter } from './routes/webhooks.js';
import { logger } from './utils/logger.js';

export const app = express();

// Trust reverse proxy (Coolify, Nginx, Traefik, Docker)
app.set('trust proxy', 1);

// Security Headers Middleware per 12-SECURITY.md
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://avatars.githubusercontent.com; connect-src 'self' https: data: http://localhost:* ws://localhost:* wss:; frame-ancestors 'none';"
  );
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

// CORS Configuration (Dynamic support for dev & production domains)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development or when explicitly matching
      if (
        origin === env.APP_URL ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://localhost:')
      ) {
        return callback(null, true);
      }
      // Allow production domain origin
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-RepoPulse-Client',
      'X-CSRF-Token',
      'X-Session-Token',
      'X-GitHub-Delivery',
      'X-GitHub-Event',
      'X-Hub-Signature-256',
    ],
  })
);

// Cookie parser
app.use(cookieParser());

// Raw body parser capture for webhook verification
app.use(
  express.json({
    limit: '100kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Health check (no rate limiter or CSRF)
app.use(healthRouter);

// Webhook endpoint (HMAC signature protected)
app.use('/webhooks', webhooksRouter);

// Static client assets if public directory exists
const publicDir = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// CSRF Defense on state-changing requests
app.use(csrfProtection);

// Auth routes (has its own dedicated rate limiter)
app.use('/auth', authRouter);

// General API rate limiter
app.use('/api', apiRateLimiter);

// Protected API routes
app.use('/api/repos', reposRouter);
app.use('/api/sync', syncRouter);
app.use('/api', settingsRouter);
app.use(shareRouter);

// Fallback for SPA routing if public directory exists
if (fs.existsSync(publicDir)) {
  app.get('*', (_req, res, next) => {
    if (
      _req.path.startsWith('/api') ||
      _req.path.startsWith('/auth') ||
      _req.path.startsWith('/webhooks') ||
      _req.path.startsWith('/s/')
    ) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 Handler for unhandled API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Requested resource does not exist.' });
});

// Centralized error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled API Error');
  res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
});
