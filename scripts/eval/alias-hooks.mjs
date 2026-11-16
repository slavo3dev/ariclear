// scripts/eval/alias-hooks.mjs
// Module resolve hook: "@/lib/x" -> <repo>/lib/x(.ts|.tsx|/index.ts).
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const isFile = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, next) {
	if (specifier.startsWith('@/')) {
		const base = path.join(repo, specifier.slice(2));
		for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
			if (isFile(c)) return next(pathToFileURL(c).href, context);
		}
	}
	return next(specifier, context);
}
