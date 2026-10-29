import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgres://postgres:postgrespassword@127.0.0.1:5432/repopulse';
process.env.DEV_LOGIN_ENABLED ??= 'true';
