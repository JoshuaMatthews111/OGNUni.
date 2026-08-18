#!/usr/bin/env node
/**
 * Seeds the store with "Secrets of the Mind & the New Creation" — Volume I,
 * Volume II, and the complete-series bundle.
 *
 * Prerequisites:
 *   1. supabase/migrations/0001_store.sql has been run in the SQL editor
 *   2. node scripts/upload-album.mjs has run (creates scripts/album-manifest.json)
 *
 *   node scripts/seed-products.mjs
 *
 * Re-runnable: upserts on slug / (bucket, storage_path), so nothing duplicates.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const VOLUME_PRICE = 50
const BUNDLE_PRICE = 100 // as specified by Prophet Joshua

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
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

const manifest = JSON.parse(readFileSync(new URL('./album-manifest.json', import.meta.url), 'utf8'))

const DESCRIPTIONS = {
  'secrets-of-the-mind-volume-1': {
    description:
      'Nineteen teachings on the inner world — the mind, the imagination, and the images you carry. Where the new creation begins.',
    long_description: `VOLUME I — THE INNER WORLD

Before anything changes around you, something has to change inside you. This first volume works on the ground floor: the mystery of the new creation man, the organ of creation that is your imagination, the gates of the mind, and the images you have been carrying without knowing it.

You will be taught how to release wrong images, how to structure your mind to agree with heaven, how to reach full persuasion, and how to refuse to bow to what you can see. It closes on covenant love and the inward journey of prayer.

Four guided meditations are included, each over fifteen minutes:
  · Releasing Wrong Images
  · I AM — New Creation Identity
  · Healing the Images of People
  · Preparing for Covenant Love

19 tracks · 2 hours 39 minutes · 320 kbps MP3
Teaching tracks are set at 528 Hz, meditations at 552 Hz, and the closing meditation at 774 Hz.`,
  },
  'secrets-of-the-mind-volume-2': {
    description:
      'Sixteen teachings on carrying the inner work outward — faith with a voice, divine direction, provision, and influencing the natural world.',
    long_description: `VOLUME II — INFLUENCING THE NATURAL WORLD

The second volume takes what was settled inwardly and gives it physical expression. Faith has a voice. Action gives the inner world a body. And there is a way to remain in faith until the promise actually manifests.

From here the teaching moves through wisdom for the promise, divine direction and decision making, the mystery of giving and honour, money as a defence, and the mindset of provision and prosperity — then into the mind of Christ in the marketplace, and living from the supernatural heart of God.

Two guided meditations are included:
  · Provision & Prosperity
  · The New Creation Experience — the closing meditation of the whole series

16 tracks · 1 hour 56 minutes · 320 kbps MP3
Teaching tracks are set at 528 Hz, meditations at 552 Hz, and the closing meditation at 774 Hz.`,
  },
}

const BUNDLE = {
  slug: 'secrets-of-the-mind-complete-series',
  title: 'Secrets of the Mind & the New Creation — Complete Series',
  subtitle: 'Volume I and Volume II together',
  description:
    'The whole teaching — both volumes, all 35 tracks, 4 hours 35 minutes. The inner world and its expression in the natural world, in order, as it was taught.',
  long_description: `THE COMPLETE SERIES

Influencing the Natural World from the Supernatural Heart of God.

Volume I settles the inner world — the mind, the imagination, the images you carry, and the identity of the new creation man. Volume II carries that work outward into voice, action, direction, provision, and the marketplace.

Six guided meditations run through the series, each over fifteen minutes, and every track was mastered for sustained listening at 320 kbps.

35 tracks · 4 hours 35 minutes · 320 kbps MP3`,
  product_type: 'bundle',
  price: BUNDLE_PRICE,
  is_bundle: true,
  duration_label: '4h 35m',
  sort_order: 0,
}

// --- volumes ---------------------------------------------------------------
const volumeIds = []

for (const [index, vol] of manifest.volumes.entries()) {
  const copy = DESCRIPTIONS[vol.slug] || {}

  const row = {
    slug: vol.slug,
    title: vol.title,
    subtitle: vol.subtitle,
    description: copy.description || null,
    long_description: copy.long_description || null,
    product_type: 'audio_album',
    price: VOLUME_PRICE,
    currency: 'usd',
    front_cover_url: vol.covers.front || null,
    back_cover_url: vol.covers.back || null,
    track_count: vol.tracks.length,
    duration_label: vol.durationLabel,
    is_bundle: false,
    is_published: true,
    sort_order: index + 1,
  }

  const { data: product, error } = await supabase
    .from('products')
    .upsert(row, { onConflict: 'slug' })
    .select('id, slug, title')
    .single()

  if (error) {
    console.error(`FAILED ${vol.slug}: ${error.message}`)
    process.exit(1)
  }

  volumeIds.push(product.id)
  console.log(`✓ ${product.title}`)

  // tracks
  const files = vol.tracks.map((t) => ({
    product_id: product.id,
    title: t.title,
    track_number: t.track_number,
    bucket: 'product-audio',
    storage_path: t.storage_path,
    file_size: t.file_size,
    mime_type: t.mime_type,
    is_preview: false,
    order_index: t.track_number ?? 0,
  }))

  const { error: filesError } = await supabase
    .from('product_files')
    .upsert(files, { onConflict: 'bucket,storage_path' })

  if (filesError) {
    console.error(`  tracks FAILED: ${filesError.message}`)
    process.exit(1)
  }
  console.log(`  ${files.length} tracks`)
}

// --- bundle ----------------------------------------------------------------
const totalTracks = manifest.volumes.reduce((n, v) => n + v.tracks.length, 0)

const { data: bundle, error: bundleError } = await supabase
  .from('products')
  .upsert(
    {
      ...BUNDLE,
      currency: 'usd',
      // Both volumes cost 2 x 50 = 100, the same as the bundle, so there is no
      // saving to advertise. Leaving compare_at_price null keeps the UI honest.
      compare_at_price: VOLUME_PRICE * 2 > BUNDLE_PRICE ? VOLUME_PRICE * 2 : null,
      front_cover_url: manifest.volumes[0]?.covers.front || null,
      back_cover_url: manifest.volumes[1]?.covers.front || null,
      track_count: totalTracks,
      is_published: true,
    },
    { onConflict: 'slug' }
  )
  .select('id, title')
  .single()

if (bundleError) {
  console.error(`FAILED bundle: ${bundleError.message}`)
  process.exit(1)
}
console.log(`✓ ${bundle.title}`)

const { error: itemsError } = await supabase
  .from('bundle_items')
  .upsert(
    volumeIds.map((id) => ({ bundle_id: bundle.id, product_id: id })),
    { onConflict: 'bundle_id,product_id' }
  )

if (itemsError) {
  console.error(`  bundle items FAILED: ${itemsError.message}`)
  process.exit(1)
}
console.log(`  unlocks ${volumeIds.length} volumes`)

console.log('\nStore seeded. Visit /store')
