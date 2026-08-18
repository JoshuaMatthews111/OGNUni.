import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || '' // postgres connection string if available

export async function POST() {
  try {
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]

    const statements = [
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'",
    ]

    const fullSql = statements.join(';\n') + ';'

    // Approach: Use Supabase's pg-meta API (available at /pg on project URL)
    // This requires the service_role key and is available on all Supabase projects
    const endpoints = [
      { url: `https://${projectRef}.supabase.co/rest/v1/rpc/run_migration`, method: 'rpc' },
      { url: `https://${projectRef}.supabase.co/pg/query`, method: 'pg' },
      { url: `https://${projectRef}.supabase.co/database/query`, method: 'database' },
    ]

    // Try pg-meta query endpoint (POST with SQL in body)
    for (const endpoint of endpoints) {
      try {
        const body = endpoint.method === 'rpc' 
          ? JSON.stringify({ query: fullSql })
          : JSON.stringify({ query: fullSql })
        
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body,
        })

        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          return NextResponse.json({ success: true, method: endpoint.method, data })
        }
      } catch {}
    }

    // Last resort: try using the Supabase Management API
    // POST https://api.supabase.com/v1/projects/{ref}/database/query
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: fullSql }),
    })

    if (mgmtRes.ok) {
      const data = await mgmtRes.json().catch(() => ({}))
      return NextResponse.json({ success: true, method: 'management-api', data })
    }

    // If nothing works, the onboarding uses localStorage fallback anyway
    // Return the SQL for manual execution
    return NextResponse.json({
      success: false,
      message: 'Supabase free tier does not allow DDL via API. The onboarding tour uses localStorage as fallback and works without these columns. To enable cross-device persistence, run this SQL in Supabase Dashboard → SQL Editor:',
      sql: fullSql,
      note: 'The onboarding tour is fully functional using localStorage. These columns are optional for cross-device sync.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
