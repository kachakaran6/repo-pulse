import { Router } from 'express';
import { pool } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get(['/healthz', '/health'], async (_req, res) => {
  let dbStatus = 'memory';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'unreachable';
    }
  }

  res.status(200).json({
    status: 'ok',
    service: 'repopulse-api',
    version: '2.0.0',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
