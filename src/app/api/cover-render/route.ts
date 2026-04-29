import { NextResponse } from 'next/server'

// This endpoint returns an SVG-based cover overlay that can be rendered client-side
// The actual compositing happens in the browser using canvas
export async function POST(request: Request) {
  try {
    const { title, subtitle, overlayColor, textPosition, accentElement } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const pos = textPosition || 'center'
    const accent = accentElement || 'gold line below title'

    // Generate SVG overlay
    const titleY = pos === 'center' ? 360 : pos === 'bottom-left' ? 580 : 580
    const titleX = pos === 'bottom-left' ? 80 : 640
    const titleAnchor = pos === 'bottom-left' ? 'start' : 'middle'
    const titleSize = title.length > 30 ? 42 : 56

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${overlayColor || 'rgba(11,28,61,0.4)'}" />
      <stop offset="100%" stop-color="rgba(11,28,61,0.85)" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>

  <!-- Overlay -->
  <rect width="1280" height="720" fill="url(#overlay)" />

  <!-- Logo Area -->
  <text x="80" y="60" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#C9A24A" letter-spacing="3">OGN UNIVERSITY</text>
  <text x="80" y="78" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.6)" letter-spacing="2">OVERCOMERS GLOBAL NETWORK</text>

  <!-- Gold accent line -->
  ${accent.includes('line') ? `<rect x="${pos === 'bottom-left' ? 80 : 540}" y="${titleY - 60}" width="${pos === 'bottom-left' ? 60 : 200}" height="3" fill="#C9A24A" rx="1.5" />` : ''}
  ${accent.includes('border') ? `<rect x="40" y="40" width="1200" height="640" fill="none" stroke="#C9A24A" stroke-width="2" rx="4" />` : ''}

  <!-- Title -->
  <text x="${titleX}" y="${titleY}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="bold" fill="#FFFFFF" text-anchor="${titleAnchor}" filter="url(#shadow)">
    ${escapeXml(title.length > 40 ? title.substring(0, 40) + '...' : title)}
  </text>

  ${subtitle ? `<text x="${titleX}" y="${titleY + 50}" font-family="Arial, sans-serif" font-size="22" fill="#C9A24A" text-anchor="${titleAnchor}">${escapeXml(subtitle)}</text>` : ''}

  <!-- Bottom bar -->
  <rect x="0" y="690" width="1280" height="30" fill="rgba(11,28,61,0.9)" />
  <text x="640" y="710" font-family="Arial, sans-serif" font-size="11" fill="#C9A24A" text-anchor="middle" letter-spacing="2">EDUCATE • EQUIP • EVOLVE</text>
</svg>`

    return NextResponse.json({
      svg,
      overlayColor: overlayColor || 'rgba(11,28,61,0.7)',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
