import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Add status column to profiles if it doesn't exist
    // Using a workaround since ALTER TABLE isn't directly available via PostgREST
    // We'll just try to update with status and if it fails, the column doesn't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';"
    })

    // If the RPC doesn't exist, we'll handle it in the API routes gracefully
    // The status field will just be null/undefined until the column is added

    return NextResponse.json({ 
      success: true, 
      message: 'Migration attempted. If the status column does not exist, please add it manually in Supabase SQL editor: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT \'active\';',
      rpc_error: error?.message 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
