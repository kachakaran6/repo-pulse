import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(16).default('repopulse_development_session_secret_key_12345'),
  COOKIE_SECRET: z.string().min(16).default('repopulse_cookie_secret_key_123456789'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default('development_webhook_secret'),
  DEMO_MODE: z.preprocess((val) => val === 'true' || val === true || val === '1' || val === undefined, z.boolean()).default(true),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    console.error(`❌ Invalid environment configuration:\n${missing}`);
  } else {
    console.error('❌ Failed to parse environment variables:', error);
  }
  // If in test or dev with missing env, fall back to defaults
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '4000',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: 'repopulse_development_session_secret_key_12345',
    COOKIE_SECRET: 'repopulse_cookie_secret_key_123456789',
    DEMO_MODE: true,
  });
}

export const env = parsedEnv;
