import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass bucket size limits and RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 60

// Only these buckets may be written to, so a caller can't name an arbitrary one.
const ALLOWED_BUCKETS = ['course-thumbnails', 'lesson-media', 'product-covers', 'product-audio']

/**
 * POST /api/upload
 * Two modes:
 * 1. mode=signed-url: Returns a signed upload URL (client uploads directly to Supabase)
 * 2. default: Accepts file via FormData and uploads server-side
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check permissions - admins/teachers can upload anything, students can only upload avatars
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile && ['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)

    const contentType = request.headers.get('content-type') || ''

    // Mode 1: JSON request for signed upload URL
    if (contentType.includes('application/json')) {
      const { fileName, bucket = 'course-thumbnails' } = await request.json()
      if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
      }
      if (!ALLOWED_BUCKETS.includes(bucket)) {
        return NextResponse.json({ error: `Unknown bucket: ${bucket}` }, { status: 400 })
      }
      // product-audio is the paid catalogue — staff only, never students.
      if (bucket === 'product-audio' && !isAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // Students can only upload their own avatar files
      if (!isAdmin && !fileName.startsWith(`avatar-${user.id}`)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // Create a signed upload URL (valid for 10 minutes, allows up to 500MB)
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUploadUrl(fileName)

      if (error) {
        console.error('Signed URL error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Get public URL for after upload
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(fileName)

      return NextResponse.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
        publicUrl: urlData.publicUrl,
      })
    }

    // Mode 2: Direct FormData upload (for smaller files or fallback)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileName = formData.get('fileName') as string | null
    const bucket = formData.get('bucket') as string || 'course-thumbnails'

    if (!file || !fileName) {
      return NextResponse.json({ error: 'File and fileName are required' }, { status: 400 })
    }
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: `Unknown bucket: ${bucket}` }, { status: 400 })
    }
    if (bucket === 'product-audio' && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Students can only upload their own avatar files
    if (!isAdmin && !fileName.startsWith(`avatar-${user.id}`)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using service role (no size limits from client policies)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    })
  } catch (err: any) {
    console.error('Upload API error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
