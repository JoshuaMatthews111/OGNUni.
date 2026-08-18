import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// This route updates the storage bucket to allow large file uploads (500MB)
// Uses direct REST API to bypass SDK limitations
export async function POST() {
  try {
    // Use Supabase Storage REST API directly
    const updateRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/course-thumbnails`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_size_limit: 52428800, // 50MB (max for free Supabase plan)
        allowed_mime_types: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
          'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/x-wav',
          'application/pdf',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream',
        ],
      }),
    })

    const updateData = await updateRes.json()

    if (!updateRes.ok) {
      return NextResponse.json({
        error: updateData.message || updateData.error || JSON.stringify(updateData),
        status: updateRes.status,
        action: 'update_bucket',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'updated',
      data: updateData,
      newLimit: '500MB (524288000 bytes)',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET to check current bucket config
export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/course-thumbnails`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    })
    const data = await res.json()
    return NextResponse.json({ bucket: data, status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
