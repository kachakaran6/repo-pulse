import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_AUTH: z.string().min(1).optional(),
  SESSION_COOKIE_NAME: z.string().default('sid'),
  DEV_LOGIN_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true || val === '1',
    z.boolean()
  ).default(false),
  DEMO_MODE_ENABLED: z.preprocess(
    (val) => val === 'true' || val === true || val === '1',
    z.boolean()
  ).default(true),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_PRIVATE_KEY_BASE64: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().default('development_webhook_secret_12345'),
}).transform((data) => {
  return {
    ...data,
    DATABASE_URL_AUTH: data.DATABASE_URL_AUTH || data.DATABASE_URL,
    SESSION_COOKIE_NAME:
      data.NODE_ENV === 'production' && data.SESSION_COOKIE_NAME === 'sid'
        ? '__Host-sid'
        : data.SESSION_COOKIE_NAME,
  };
});

export type Env = z.infer<typeof envSchema>;
export { envSchema };

export function parseAndValidateEnv(sourceEnv: Record<string, any> = process.env): Env {
  const result = envSchema.safeParse(sourceEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`\n❌ FATAL: Invalid environment configuration:\n${errorDetails}\n`);
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }

  const parsed = result.data;

  // Strict Security Constraint: Dev login MUST NOT be enabled in production
  if (parsed.NODE_ENV === 'production' && parsed.DEV_LOGIN_ENABLED === true) {
    console.error('\n❌ FATAL SECURITY ERROR: DEV_LOGIN_ENABLED cannot be true when NODE_ENV is production.\n');
    throw new Error('FATAL SECURITY ERROR: DEV_LOGIN_ENABLED cannot be true when NODE_ENV is production.');
  }

  return parsed;
}

export const env = parseAndValidateEnv();
