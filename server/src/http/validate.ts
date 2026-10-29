import type { Request, Response } from 'express';
import { z } from 'zod';
import { sendError } from './errors.js';

const queryString = z.string().max(500);

/**
 * Read a query value the way the routes always have:
 * a single string is kept, anything else is rejected.
 * Missing keys stay undefined so filters are unchanged.
 */
export function readQueryString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const parsed = queryString.safeParse(value);
  if (!parsed.success) {
    throw new QueryValidationError();
  }
  return parsed.data;
}

export class QueryValidationError extends Error {
  constructor() {
    super('Query parameters must be strings.');
    this.name = 'QueryValidationError';
  }
}

export function rejectQuery(res: Response): void {
  sendError(res, 400, 'Validation Error', 'Query parameters must be strings.');
}

const savedViewBody = z.object({
  name: z.string().min(1).max(200),
  query: z.unknown().optional(),
});

const syncQuery = z.object({
  force: queryString.optional(),
  wait: queryString.optional(),
});

const oauthQuery = z.object({
  error: queryString.optional(),
  error_description: queryString.optional(),
  code: queryString.optional(),
  state: queryString.optional(),
});

const repoListQuery = z.object({
  view: queryString.optional(),
  search: queryString.optional(),
  status: queryString.optional(),
  relationship: queryString.optional(),
  visibility: queryString.optional(),
  language: queryString.optional(),
  label: queryString.optional(),
  decision: queryString.optional(),
  sort: queryString.optional(),
});

const routeId = z.string().min(1).max(200);

const webhookPayload = z.object({}).passthrough();

export function parseSavedViewBody(req: Request, res: Response): z.infer<typeof savedViewBody> | undefined {
  const parsed = savedViewBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 400, 'Name is required', 'Name is required', parsed.error.issues);
    return undefined;
  }
  return parsed.data;
}

export function parseSyncQuery(req: Request, res: Response): { force?: string; wait?: string } | undefined {
  const parsed = syncQuery.safeParse({
    force: req.query.force,
    wait: req.query.wait,
  });
  if (!parsed.success) {
    rejectQuery(res);
    return undefined;
  }
  return parsed.data;
}

export function parseRepoListQuery(
  req: Request,
  res: Response,
): z.infer<typeof repoListQuery> | undefined {
  const parsed = repoListQuery.safeParse({
    view: req.query.view,
    search: req.query.search,
    status: req.query.status,
    relationship: req.query.relationship,
    visibility: req.query.visibility,
    language: req.query.language,
    label: req.query.label,
    decision: req.query.decision,
    sort: req.query.sort,
  });
  if (!parsed.success) {
    rejectQuery(res);
    return undefined;
  }
  return parsed.data;
}

/**
 * OAuth callback query. Returns undefined when the query is not a set of strings.
 * Callers keep the existing redirect behavior.
 */
export function parseOAuthQuery(query: Request['query']): z.infer<typeof oauthQuery> | undefined {
  const parsed = oauthQuery.safeParse({
    error: query.error,
    error_description: query.error_description,
    code: query.code,
    state: query.state,
  });
  if (!parsed.success) return undefined;
  return parsed.data;
}

export function parseRouteId(value: unknown, res: Response): string | undefined {
  const parsed = routeId.safeParse(value);
  if (!parsed.success) {
    sendError(res, 400, 'Validation Error', 'Route parameter is invalid.');
    return undefined;
  }
  return parsed.data;
}

export function parseWebhookPayload(body: unknown): Record<string, unknown> | undefined {
  const parsed = webhookPayload.safeParse(body);
  if (!parsed.success) return undefined;
  return parsed.data;
}
