import { describe, it, expect } from 'vitest';
import { parseAndValidateEnv } from '../src/config/env.js';

describe('Server Boot Guard Security Test (Step 7)', () => {
  it('crashes with a fatal error if NODE_ENV=production and DEV_LOGIN_ENABLED=true', () => {
    expect(() => {
      parseAndValidateEnv({
        NODE_ENV: 'production',
        DEV_LOGIN_ENABLED: 'true',
        DATABASE_URL: 'postgres://postgres:postgrespassword@localhost:5432/repopulse',
      });
    }).toThrow('FATAL SECURITY ERROR: DEV_LOGIN_ENABLED cannot be true when NODE_ENV is production');
  });

  it('allows boot in development mode when DEV_LOGIN_ENABLED=true', () => {
    const validDev = parseAndValidateEnv({
      NODE_ENV: 'development',
      DEV_LOGIN_ENABLED: 'true',
      DATABASE_URL: 'postgres://postgres:postgrespassword@localhost:5432/repopulse',
    });

    expect(validDev.NODE_ENV).toBe('development');
    expect(validDev.DEV_LOGIN_ENABLED).toBe(true);
  });

  it('allows boot in production mode when DEV_LOGIN_ENABLED=false', () => {
    const validProd = parseAndValidateEnv({
      NODE_ENV: 'production',
      DEV_LOGIN_ENABLED: 'false',
      DATABASE_URL: 'postgres://postgres:postgrespassword@localhost:5432/repopulse',
    });

    expect(validProd.NODE_ENV).toBe('production');
    expect(validProd.DEV_LOGIN_ENABLED).toBe(false);
    expect(validProd.SESSION_COOKIE_NAME).toBe('__Host-sid');
  });
});
