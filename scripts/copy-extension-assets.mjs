import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const require = createRequire(import.meta.url)

if (!existsSync(dist)) {
  console.error('dist/ missing — run vite build first')
  process.exit(1)
}

copyFileSync(join(root, 'public/manifest.json'), join(dist, 'manifest.json'))
copyFileSync(join(root, 'public/background.js'), join(dist, 'background.js'))

const iconsSrc = join(root, 'public/icons')
const iconsDest = join(dist, 'icons')
mkdirSync(iconsDest, { recursive: true })
cpSync(iconsSrc, iconsDest, { recursive: true })

const polyfill = require.resolve('webextension-polyfill/dist/browser-polyfill.js')
copyFileSync(polyfill, join(dist, 'browser-polyfill.js'))

console.log('Extension assets copied to dist/')
