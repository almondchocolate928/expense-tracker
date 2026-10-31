import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const publicDir = path.resolve('public')

const targets = [
  { source: 'icon.svg', size: 192, name: 'pwa-192x192.png' },
  { source: 'icon.svg', size: 512, name: 'pwa-512x512.png' },
  { source: 'icon.svg', size: 180, name: 'apple-touch-icon.png' },
  { source: 'icon-maskable.svg', size: 512, name: 'pwa-maskable-512x512.png' },
  { source: 'favicon.svg', size: 64, name: 'favicon-64.png' },
]

await mkdir(publicDir, { recursive: true })

for (const { source, size, name } of targets) {
  await sharp(path.join(publicDir, source), { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, name))
  console.log(`generated ${name} (${size}x${size})`)
}
