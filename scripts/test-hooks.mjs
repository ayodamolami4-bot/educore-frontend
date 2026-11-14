// ESM resolve hook: maps extensionless relative specifiers onto .js / .jsx
// files so that the converted JavaScript source (which kept the original
// extensionless import style from the TypeScript project) can be loaded by
// Node's strict ESM resolver.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { readFileSync } from 'node:fs';

const JS_CANDIDATES = ['.js', '.jsx'];

export async function resolve(specifier, context, nextResolve) {
  const parentURL = context.parentURL;
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && parentURL) {
    const parent = fileURLToPath(parentURL);
    const baseDir = dirname(parent);
    const target = normalize(join(baseDir, specifier));
    for (const ext of JS_CANDIDATES) {
      try {
        readFileSync(target + ext);
        return {
          url: pathToFileURL(target + ext).href,
          shortCircuit: true,
        };
      } catch {
        // try next candidate
      }
    }
  }
  return nextResolve(specifier, context);
}
