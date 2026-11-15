import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
// Register an ESM resolve hook so the source (written for Metro, which
// auto-resolves file extensions) can be imported by Node's native ESM loader.
const resolverHook = join(here, 'register-extension-resolver.mjs');

function collect(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? collect(join(folder, entry.name))
      : entry.name.endsWith('.test.js') || entry.name.endsWith('.test.mjs')
        ? [join(folder, entry.name)]
        : [],
  );
}
const files = [...collect('tests'), ...collect('src/features')];
const result = spawnSync(process.execPath, ['--import', resolverHook, '--test', ...files], {
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
