import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Signing URLs for a private bucket needs the service role key.
const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const SIGNED_URL_TTL = 300 // seconds — long enough to start a download, short enough not to be shareable

/**
 * POST /api/download   { fileId }        → one track
 * POST /api/download   { productId }     → every track in a product
 *
 * Returns short-lived signed URLs. The audio bucket is private, so this route
 * is the only way to get bytes out, and it refuses unless the signed-in user
 * has a completed purchase covering that product.
 */
export async function POST(req: NextRequest) {
  try {
    const { fileId, productId } = await req.json()
    if (!fileId && !productId) {
      return NextResponse.json({ error: 'fileId or productId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to download' }, { status: 401 })
    }

    // Resolve the request to a set of files and the product that gates them.
    let files: any[] = []
    let gateProductId: string

    if (fileId) {
      const { data: file } = await admin
        .from('product_files')
        .select('id, product_id, title, track_number, bucket, storage_path, is_preview')
        .eq('id', fileId)
        .single()

      if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })
      files = [file]
      gateProductId = file.product_id
    } else {
      const { data: rows } = await admin
        .from('product_files')
        .select('id, product_id, title, track_number, bucket, storage_path, is_preview')
        .eq('product_id', productId)
        .order('order_index', { ascending: true })

      if (!rows?.length) return NextResponse.json({ error: 'No files for this product' }, { status: 404 })
      files = rows
      gateProductId = productId
    }

    // Previews are open to anyone signed in; everything else needs a purchase.
    const allPreview = files.every((f) => f.is_preview)

    if (!allPreview) {
      const { data: purchase } = await admin
        .from('product_purchases')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('product_id', gateProductId)
        .eq('status', 'completed')
        .maybeSingle()

      if (!purchase) {
        // Staff can always pull their own catalogue.
        const { data: profile } = await admin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const isStaff = ['super_admin', 'prophet', 'teacher'].includes(profile?.role || '')
        if (!isStaff) {
          return NextResponse.json(
            { error: 'You do not own this yet.', needsPurchase: true },
            { status: 403 }
          )
        }
      }
    }

    const downloads = []
    for (const file of files) {
      const filename = file.track_number
        ? `${String(file.track_number).padStart(2, '0')} ${file.title}.mp3`
        : `${file.title}.mp3`

      const { data, error } = await admin.storage
        .from(file.bucket)
        .createSignedUrl(file.storage_path, SIGNED_URL_TTL, { download: filename })

      if (error || !data) {
        console.error('Signing failed for', file.storage_path, error?.message)
        continue
      }

      downloads.push({
        fileId: file.id,
        title: file.title,
        trackNumber: file.track_number,
        filename,
        url: data.signedUrl,
      })
    }

    if (!downloads.length) {
      return NextResponse.json({ error: 'Could not prepare downloads' }, { status: 500 })
    }

    // Audit trail — fire and forget.
    admin
      .from('product_download_logs')
      .insert(
        downloads.map((d) => ({
          user_id: user.id,
          product_id: gateProductId,
          product_file_id: d.fileId,
        }))
      )
      .then(({ error }) => {
        if (error) console.error('download log failed:', error.message)
      })

    return NextResponse.json({ downloads, expiresIn: SIGNED_URL_TTL })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 })
  }
}
