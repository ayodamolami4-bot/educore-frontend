import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function collect(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? collect(join(folder, entry.name))
      : entry.name.endsWith('.test.ts')
        ? [join(folder, entry.name)]
        : [],
  );
}
const files = [...collect('tests'), ...collect('src/features')];
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
