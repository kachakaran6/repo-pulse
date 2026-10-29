import type { Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * JSON error body used by every API response.
 * `error` is the stable short code. `message` is the sentence clients already display.
 * `details` is present only for validation failures.
 */
export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export function sendError(
  res: Response,
  status: number,
  error: string,
  message?: string,
  details?: unknown,
): void {
  const body: ApiErrorBody = {
    error,
    message: message ?? error,
  };
  if (details !== undefined) {
    body.details = details;
  }

  logger.warn(
    {
      event: 'api_error',
      status,
      error: body.error,
      message: body.message,
    },
    'API request rejected',
  );

  res.status(status).json(body);
}
