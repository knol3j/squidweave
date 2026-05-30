import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const uiRoot = resolve(scriptDir, '..')
const distDir = resolve(uiRoot, 'dist')
const noJekyllPath = resolve(distDir, '.nojekyll')

if (!existsSync(distDir)) {
  throw new Error(`Expected build output at ${distDir}`)
}

mkdirSync(distDir, { recursive: true })
writeFileSync(noJekyllPath, '')
