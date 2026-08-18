import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Pinged daily by Vercel Cron (see vercel.json) so the free-plan Supabase
// project never hits the 7-day inactivity pause that took the site down.
export async function GET() {
  const results: Record<string, string> = {}

  // Primary: OGN University database
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
    results.ogn_university = error ? `error: ${error.message}` : 'alive'
  } catch (e: any) {
    results.ogn_university = `error: ${e.message}`
  }

  // Optional: second Supabase project (e.g. the OGN mobile app DB),
  // configured via KEEPALIVE_EXTRA_SUPABASE_URL / _KEY env vars.
  const extraUrl = process.env.KEEPALIVE_EXTRA_SUPABASE_URL
  const extraKey = process.env.KEEPALIVE_EXTRA_SUPABASE_KEY
  if (extraUrl && extraKey) {
    try {
      const res = await fetch(`${extraUrl}/rest/v1/`, { headers: { apikey: extraKey }, cache: 'no-store' })
      results.extra = res.ok || res.status === 401 ? 'alive' : `http ${res.status}`
    } catch (e: any) {
      results.extra = `error: ${e.message}`
    }
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString(), results })
}
