#!/usr/bin/env node
/**
 * Uploads the "Secrets of the Mind & the New Creation" audio and covers to Supabase.
 *
 *   node scripts/upload-album.mjs            # upload everything, skip what's already there
 *   node scripts/upload-album.mjs --force    # re-upload even if present
 *   node scripts/upload-album.mjs --covers   # covers only (fast)
 *
 * Audio  → private bucket  product-audio
 * Covers → public  bucket  product-covers
 *
 * Writes scripts/album-manifest.json, which seed-products.mjs turns into rows.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOT = '/Users/user/Downloads'
const AUDIO_BUCKET = 'product-audio'
const COVER_BUCKET = 'product-covers'

const force = process.argv.includes('--force')
const coversOnly = process.argv.includes('--covers')

// --- env -------------------------------------------------------------------
const envPath = new URL('../.env.local', import.meta.url).pathname
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// --- helpers ---------------------------------------------------------------
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** "07 Thought  Emotion  Action.mp3" -> { track: 7, title: "Thought Emotion Action" } */
function parseTrack(filename) {
  const stem = basename(filename, '.mp3')
  const m = stem.match(/^(\d+)\s+(.*)$/)
  const track = m ? Number.parseInt(m[1], 10) : null
  const title = (m ? m[2] : stem).replace(/\s{2,}/g, ' ').trim()
  return { track, title }
}

async function upload(bucket, path, absFile, contentType) {
  if (!force) {
    const { data } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'), {
      search: basename(path),
    })
    if (data?.some((f) => f.name === basename(path))) return 'skipped'
  }
  const body = readFileSync(absFile)
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw new Error(`${path}: ${error.message}`)
  return 'uploaded'
}

// --- volumes ---------------------------------------------------------------
const VOLUMES = [
  {
    key: 'volume-1',
    dir: join(ROOT, 'VOLUME-I'),
    slug: 'secrets-of-the-mind-volume-1',
    title: 'Secrets of the Mind & the New Creation — Volume I',
    subtitle: 'The Inner World',
    durationLabel: '2h 39m',
  },
  {
    key: 'volume-2',
    dir: join(ROOT, 'VOLUME-II'),
    slug: 'secrets-of-the-mind-volume-2',
    title: 'Secrets of the Mind & the New Creation — Volume II',
    subtitle: 'Influencing the Natural World',
    durationLabel: '1h 56m',
  },
]

const manifest = { volumes: [] }
let uploaded = 0
let skipped = 0

for (const vol of VOLUMES) {
  if (!existsSync(vol.dir)) {
    console.error(`MISSING DIRECTORY: ${vol.dir}`)
    process.exit(1)
  }

  const entry = { ...vol, covers: {}, tracks: [] }

  // covers
  for (const [side, file] of [['front', 'FRONT COVER.png'], ['back', 'BACK COVER.png']]) {
    const abs = join(vol.dir, file)
    if (!existsSync(abs)) {
      console.error(`  missing cover: ${abs}`)
      continue
    }
    const path = `${vol.key}/${side}-cover.png`
    const res = await upload(COVER_BUCKET, path, abs, 'image/png')
    res === 'uploaded' ? uploaded++ : skipped++
    const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path)
    entry.covers[side] = data.publicUrl
    console.log(`  ${res.padEnd(8)} cover  ${path}`)
  }

  if (!coversOnly) {
    const files = readdirSync(vol.dir)
      .filter((f) => f.toLowerCase().endsWith('.mp3'))
      .sort()

    for (const file of files) {
      const abs = join(vol.dir, file)
      const size = statSync(abs).size
      const { track, title } = parseTrack(file)

      if (size > 50 * 1024 * 1024) {
        console.error(`  TOO BIG (${(size / 1048576).toFixed(1)}MB, 50MB cap): ${file}`)
        continue
      }

      const path = `${vol.key}/${String(track).padStart(2, '0')}-${slugify(title)}.mp3`
      const res = await upload(AUDIO_BUCKET, path, abs, 'audio/mpeg')
      res === 'uploaded' ? uploaded++ : skipped++

      entry.tracks.push({
        track_number: track,
        title,
        storage_path: path,
        file_size: size,
        mime_type: 'audio/mpeg',
      })
      console.log(`  ${res.padEnd(8)} ${(size / 1048576).toFixed(1).padStart(5)}MB  ${path}`)
    }
    entry.trackCount = entry.tracks.length
  }

  manifest.volumes.push(entry)
  console.log(`✓ ${vol.title}\n`)
}

writeFileSync(new URL('./album-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2))
console.log(`\nuploaded ${uploaded}, skipped ${skipped}`)
console.log('manifest → scripts/album-manifest.json')
