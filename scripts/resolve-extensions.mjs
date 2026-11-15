// ESM resolve hook: add a `.js` extension to extensionless relative imports
// so the source (written for Metro, which auto-resolves extensions) can be
// loaded by Node's native ESM loader used by `node --test`.

const EXT = '.js';
const INDEX = 'index' + EXT;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (!hasExtension(specifier)) {
      try {
        return await nextResolve(specifier + EXT, context);
      } catch {
        if (context.parentURL) {
          try {
            return await nextResolve(specifier + '/' + INDEX, context);
          } catch {
            // fall through to the original error
          }
        }
      }
    }
  }
  return nextResolve(specifier, context);
}

function hasExtension(spec) {
  const last = spec.split('/').pop();
  return last.includes('.') && last.lastIndexOf('.') > 0;
}
