import { Router } from 'express';
import { handleGitHubWebhook } from '../webhooks/handler.js';

export const webhooksRouter = Router();

webhooksRouter.post('/github', handleGitHubWebhook);
