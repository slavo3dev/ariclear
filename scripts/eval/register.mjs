// scripts/eval/register.mjs
// Lets plain Node run the eval against the app's own TypeScript code: it
// resolves the "@/..." import alias (tsconfig paths) to files in the repo.
// Node 24 strips the TypeScript types itself; no build step, no new package.
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
