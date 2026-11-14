import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function violations(mapping, username, paths) {
  const actor = username.toLowerCase();
  if (actor === mapping.lead.toLowerCase()) return [];
  const roles = Object.entries(mapping.roles)
    .filter(([, users]) => users.some((user) => user.toLowerCase() === actor))
    .map(([role]) => role);
  if (!roles.length)
    return [
      'No role is assigned to this GitHub username. The lead must update team-ownership.json on main.',
    ];
  return paths.filter((path) => !roles.some((role) => path.startsWith(`src/features/${role}/`)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const actor = process.env.PR_AUTHOR ?? process.argv[2];
  const base = process.env.PR_BASE_SHA ?? process.argv[3] ?? 'origin/main';
  if (!actor || !/^[a-zA-Z0-9-]+(?:\[bot\])?$/.test(actor))
    throw new Error('Provide the PR author GitHub username.');
  if (!/^[a-f0-9]{40}$/.test(base) && base !== 'origin/main')
    throw new Error('Use the trusted base commit SHA or origin/main.');
  const mapping = JSON.parse(
    execFileSync('git', ['show', `${base}:team-ownership.json`], { encoding: 'utf8' }),
  );
  const paths = execFileSync(
    'git',
    ['diff', '--name-only', '--no-renames', '-z', `${base}...HEAD`],
    { encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  const denied = violations(mapping, actor, paths);
  if (denied.length) {
    console.error('Changes outside the assigned role area:');
    for (const path of denied) console.error(` - ${path}`);
    process.exitCode = 1;
  } else
    console.log(
      `Scope check passed for ${actor}; ${paths.length} changed paths checked against the base branch mapping.`,
    );
}
