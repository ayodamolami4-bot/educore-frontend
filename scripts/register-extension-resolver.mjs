// Register an ESM resolve hook (via module.register) that adds a `.js`
// extension to extensionless relative imports. This lets the source —
// written for Metro, which auto-resolves extensions — run under Node's
// native ESM loader used by `node --test`.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./scripts/resolve-extensions.mjs', pathToFileURL('./'));
