import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// TEMPORARY diagnostic — reports whether the SendGrid key is present in this
// runtime and whether SendGrid accepts it from Vercel's IPs. No secrets leaked.
export async function GET() {
  const key = process.env.SENDGRID_API_KEY || ''
  const info: Record<string, any> = {
    keyPresent: key.length > 0,
    keyLength: key.length,
    keyPrefix: key.slice(0, 3),
  }
  if (key) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/scopes', {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      info.sendgridStatus = res.status
      if (res.status !== 200) info.sendgridBody = (await res.text()).slice(0, 300)
    } catch (e: any) {
      info.sendgridError = e.message
    }
  }
  return NextResponse.json(info)
}
