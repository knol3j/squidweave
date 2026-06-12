import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const uiRoot = resolve(scriptDir, '..')
const distDir = resolve(uiRoot, 'dist')
const noJekyllPath = resolve(distDir, '.nojekyll')
const indexPath = resolve(distDir, 'index.html')
const notFoundPath = resolve(distDir, '404.html')

if (!existsSync(distDir)) {
  throw new Error(`Expected build output at ${distDir}`)
}

mkdirSync(distDir, { recursive: true })
writeFileSync(noJekyllPath, '')
copyFileSync(indexPath, notFoundPath)
