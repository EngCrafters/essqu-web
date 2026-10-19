import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/*
 * Module resolution for the unit tests, which run on Node's own test runner with its built-in
 * TypeScript type stripping (no test framework to install). Node needs three things the Next.js
 * bundler normally provides:
 *
 *   '@/…'           the tsconfig path alias for the repository root
 *   './x'           extensionless relative imports → x.ts / x.tsx / x/index.ts
 *   'server-only'   Next.js's build-time marker → an empty module (the tests are server code)
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SERVER_ONLY = new URL('./server-only.mjs', import.meta.url).href

function find(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return pathToFileURL(candidate).href
  }
  return null
}

export async function resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: SERVER_ONLY, shortCircuit: true }
  if (specifier.startsWith('@/')) {
    const url = find(path.join(ROOT, specifier.slice(2)))
    if (url) return { url, shortCircuit: true }
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const url = find(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
    if (url) return { url, shortCircuit: true }
  }
  return next(specifier, context)
}
