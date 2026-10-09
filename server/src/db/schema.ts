import { pgTable, bigserial, bigint, text, timestamp, boolean, integer, date, jsonb, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  github_user_id: bigint('github_user_id', { mode: 'number' }).unique().notNull(),
  github_token: text('github_token'),
  login: text('login').notNull(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

export const sessions = pgTable('sessions', {
  id_hash: text('id_hash').primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  last_seen_at: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip_hash: text('ip_hash'),
  ua: text('ua'),
});

export const installations = pgTable('installations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  github_installation_id: bigint('github_installation_id', { mode: 'number' }).unique().notNull(),
  account_login: text('account_login').notNull(),
  account_type: text('account_type').default('User').notNull(),
  selection: text('selection').default('all').notNull(),
  repo_count: integer('repo_count').default(0).notNull(),
  private_repo_count: integer('private_repo_count').default(0).notNull(),
  public_repo_count: integer('public_repo_count').default(0).notNull(),
  suspended_at: timestamp('suspended_at', { withTimezone: true }),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repos = pgTable('repos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  installation_id: bigint('installation_id', { mode: 'number' }).references(() => installations.id, { onDelete: 'set null' }),
  github_repo_id: bigint('github_repo_id', { mode: 'number' }).notNull(),
  full_name: text('full_name').notNull(),
  is_private: boolean('is_private').default(false).notNull(),
  is_fork: boolean('is_fork').default(false).notNull(),
  is_archived: boolean('is_archived').default(false).notNull(),
  owner_login: text('owner_login').default('').notNull(),
  owner_type: text('owner_type').default('User').notNull(),
  relationship: text('relationship').default('owner').notNull(),
  permission: text('permission').default('admin').notNull(),
  default_branch: text('default_branch').default('main').notNull(),
  last_commit_at: timestamp('last_commit_at', { withTimezone: true }),
  pushed_at: timestamp('pushed_at', { withTimezone: true }),
  created_at_github: timestamp('created_at_github', { withTimezone: true }),
  language: text('language'),
  archived_on_github: boolean('archived_on_github').default(false).notNull(),
  synced_at: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repoActivity = pgTable('repo_activity', {
  repo_id: bigint('repo_id', { mode: 'number' }).references(() => repos.id, { onDelete: 'cascade' }).notNull(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  day: date('day').notNull(),
  commits_mine: integer('commits_mine').default(0).notNull(),
  commits_all: integer('commits_all').default(0).notNull(),
  commits: integer('commits').default(0).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.repo_id, table.day] }),
}));

export const repoContributors = pgTable('repo_contributors', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repo_id: bigint('repo_id', { mode: 'number' }).references(() => repos.id, { onDelete: 'cascade' }).notNull(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  login: text('login').notNull(),
  avatar_url: text('avatar_url'),
  commits_30d: integer('commits_30d').default(0).notNull(),
});

export const statusChanges = pgTable('status_changes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  repo_id: bigint('repo_id', { mode: 'number' }).references(() => repos.id, { onDelete: 'cascade' }).notNull(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull(),
  since: timestamp('since', { withTimezone: true }).defaultNow().notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repoMeta = pgTable('repo_meta', {
  repo_id: bigint('repo_id', { mode: 'number' }).primaryKey().references(() => repos.id, { onDelete: 'cascade' }),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  label: text('label'),
  goal_date: date('goal_date'),
  note: text('note'),
  decision: text('decision').$type<'keep' | 'pause' | 'retire'>(),
  paused_until: date('paused_until'),
  decided_at: timestamp('decided_at', { withTimezone: true }),
});

export const settings = pgTable('settings', {
  user_id: bigint('user_id', { mode: 'number' }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  active_days: integer('active_days').default(7).notNull(),
  cooling_days: integer('cooling_days').default(14).notNull(),
  stale_days: integer('stale_days').default(30).notNull(),
  theme: text('theme').default('system').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const savedViews = pgTable('saved_views', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  query: jsonb('query').default({}).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const snapshots = pgTable('snapshots', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title'),
  template: text('template').default('summary').notNull(),
  config: jsonb('config').default({}).notNull(),
  data: jsonb('data').default({}).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
});

export const achievements = pgTable('achievements', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  key: text('key').notNull(),
  earned_at: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
  meta: jsonb('meta').default({}).notNull(),
});

export const syncRuns = pgTable('sync_runs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
  status: text('status').$type<'running' | 'success' | 'failed' | 'rate_limited'>().default('running').notNull(),
  repos_read: integer('repos_read').default(0).notNull(),
  error: text('error'),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  event: text('event').notNull(),
  meta: jsonb('meta').default({}).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
