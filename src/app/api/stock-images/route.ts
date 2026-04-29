import { NextRequest, NextResponse } from 'next/server'

// Simple hash to get deterministic seed from query
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  try {
    const images: any[] = []
    const base = hashCode(query)

    // Picsum Photos - 100% reliable, free, no auth needed
    // Deterministic seeds based on query so same search = consistent results
    for (let i = 0; i < 12; i++) {
      const seed = base + i * 37
      images.push({
        id: `picsum-${i}`,
        url: `https://picsum.photos/seed/${seed}/1280/720`,
        thumb: `https://picsum.photos/seed/${seed}/400/225`,
        alt: `Background option ${i + 1}`,
        credit: 'Picsum Photos',
      })
    }

    return NextResponse.json({ images, query })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
