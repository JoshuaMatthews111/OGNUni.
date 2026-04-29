import { NextRequest, NextResponse } from 'next/server'

// Uses Unsplash Source (no auth required) + Unsplash public search
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  try {
    // Use Unsplash public API (no key needed for source URLs)
    // Generate multiple image URLs using Unsplash Source
    const images = []
    const searchTerms = query.split(' ').slice(0, 4).join(',')

    // Generate 8 different stock image options using Unsplash Source random
    for (let i = 0; i < 8; i++) {
      const seed = `${query}-${i}-${Date.now()}`
      images.push({
        id: `stock-${i}`,
        url: `https://source.unsplash.com/featured/1280x720/?${encodeURIComponent(searchTerms)}&sig=${i}`,
        thumb: `https://source.unsplash.com/featured/400x225/?${encodeURIComponent(searchTerms)}&sig=${i}`,
        alt: `${query} stock photo ${i + 1}`,
        credit: 'Unsplash',
      })
    }

    // Also try Picsum as fallback (always works, no auth)
    for (let i = 0; i < 4; i++) {
      const seed = Math.floor(Math.random() * 1000)
      images.push({
        id: `picsum-${i}`,
        url: `https://picsum.photos/seed/${seed}/1280/720`,
        thumb: `https://picsum.photos/seed/${seed}/400/225`,
        alt: `Random background ${i + 1}`,
        credit: 'Picsum',
      })
    }

    return NextResponse.json({ images, query })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
