import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const videoUrl = request.nextUrl.searchParams.get('url')
  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Extract YouTube video ID from various URL formats
  const id = extractYouTubeId(videoUrl)
  if (!id) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  // YouTube provides free thumbnails at these URLs (no API key needed)
  const thumbnails = {
    default: `https://img.youtube.com/vi/${id}/default.jpg`,       // 120x90
    medium: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,      // 320x180
    high: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,        // 480x360
    standard: `https://img.youtube.com/vi/${id}/sddefault.jpg`,    // 640x480
    maxres: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,  // 1280x720
  }

  // Try to get the video title via oEmbed (free, no API key)
  let title = ''
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    if (oembedRes.ok) {
      const oembed = await oembedRes.json()
      title = oembed.title || ''
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    videoId: id,
    title,
    thumbnails,
    recommended: thumbnails.maxres,
  })
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}
