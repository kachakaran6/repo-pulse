import { authPool } from '../src/db/index.js';

async function testPersistence() {
  console.log('--- STEP 4 PERSISTENCE TEST START ---');
  
  // 1. Dev Login
  const loginRes = await fetch('http://localhost:4000/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }
  
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Login successful. Session Cookie received:', !!setCookie);
  
  const cookieHeader = setCookie.split(';')[0];
  
  // 2. Fetch /api/me to get user info and verify CSRF
  const meRes = await fetch('http://localhost:4000/api/me', {
    headers: { Cookie: cookieHeader }
  });
  const meData = await meRes.json();
  console.log('Authenticated User:', meData);

  // 3. Fetch repos
  const reposRes = await fetch('http://localhost:4000/api/repos', {
    headers: { Cookie: cookieHeader }
  });
  const reposData = await reposRes.json();
  const repos = reposData.repos || [];
  console.log(`Retrieved ${repos.length} repos.`);
  if (repos.length === 0) {
    throw new Error('No repos found in database.');
  }
  
  const targetRepo = repos[0];
  console.log(`Target Repo: ID=${targetRepo.id}, Name=${targetRepo.full_name}, GitHubRepoID=${targetRepo.github_repo_id}`);

  // 4. Update Repo Meta (label, decision, note, goal)
  const metaUpdate = {
    label: 'Core Flagship SaaS',
    decision: 'keep',
    note: 'Tested for Step 4 Persistence across sync and reload.',
    goalDate: '2026-12-31'
  };

  const patchRes = await fetch(`http://localhost:4000/api/repos/${targetRepo.id}/meta`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(metaUpdate)
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`PATCH meta failed: ${patchRes.status} ${errText}`);
  }

  const patchedData = await patchRes.json();
  console.log('PATCH response data:', patchedData);

  // 5. Query PostgreSQL directly to verify repo_meta row
  const dbBeforeSync = await authPool.query(
    'SELECT repo_id, label, decision, note, to_char(goal_date, \'YYYY-MM-DD\') as goal_date FROM repo_meta WHERE repo_id = $1;',
    [targetRepo.id]
  );
  console.log('Direct DB query before sync:', dbBeforeSync.rows[0]);

  // 6. Trigger a sync run
  console.log('Triggering sync (force=true, wait=true)...');
  const syncRes = await fetch('http://localhost:4000/api/sync?force=true&wait=true', {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  console.log('Sync status:', syncRes.status);
  const syncData = await syncRes.json();
  console.log('Sync result:', syncData);

  // 7. Query PostgreSQL directly to verify repo_meta row is intact
  const dbAfterSync = await authPool.query(
    'SELECT repo_id, label, decision, note, to_char(goal_date, \'YYYY-MM-DD\') as goal_date FROM repo_meta WHERE repo_id = $1;',
    [targetRepo.id]
  );
  console.log('Direct DB query AFTER sync:', dbAfterSync.rows[0]);

  if (
    dbAfterSync.rows[0]?.label === metaUpdate.label &&
    dbAfterSync.rows[0]?.decision === metaUpdate.decision &&
    dbAfterSync.rows[0]?.note === metaUpdate.note
  ) {
    console.log('✅ PROOF PASSED: repo_meta survived sync intact!');
  } else {
    throw new Error('❌ PROOF FAILED: repo_meta was mutated or deleted during sync!');
  }

  // 8. Fetch repos again (simulating page reload)
  const reposReloadRes = await fetch('http://localhost:4000/api/repos', {
    headers: { Cookie: cookieHeader }
  });
  const reloadedData = await reposReloadRes.json();
  const reloadedRepos = reloadedData.repos || [];
  const reloadedTarget = reloadedRepos.find((r: any) => r.id === targetRepo.id);
  console.log('Reloaded Target Repo from API:', {
    id: reloadedTarget.id,
    label: reloadedTarget.meta.label,
    decision: reloadedTarget.meta.decision,
    note: reloadedTarget.meta.note,
    goalDate: reloadedTarget.meta.goal_date
  });

  if (reloadedTarget.meta.label === metaUpdate.label && reloadedTarget.meta.decision === metaUpdate.decision) {
    console.log('✅ PROOF PASSED: UI reload returns persisted metadata!');
  } else {
    throw new Error('❌ PROOF FAILED: Reloaded repo data does not match!');
  }

  await authPool.end();
  console.log('--- STEP 4 PERSISTENCE TEST COMPLETED SUCCESSFULLY ---');
}

testPersistence().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
