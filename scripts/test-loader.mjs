// Self-registering loader entry point.
// Usage: node --import ./scripts/test-loader.mjs ...
// It registers the resolve hook from test-hooks.mjs, which maps extensionless
// relative specifiers (./foo, ../bar) onto .js / .jsx files so the converted
// source can be loaded by Node's strict ESM resolver without rewriting every
// import statement.
import { register } from 'node:module';

register('./test-hooks.mjs', import.meta.url);

export {};
