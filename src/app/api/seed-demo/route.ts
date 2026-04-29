import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isPlaceholder(value: string | undefined) {
  if (!value) return true
  return (
    value.includes('your-project') ||
    value.includes('your_anon_key_here') ||
    value.includes('your_service_role_key_here')
  )
}

const supabaseAdmin =
  supabaseUrl && serviceRoleKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(serviceRoleKey)
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

const DEMO_ACCOUNTS = [
  { email: 'student@overcomersuniversity.com', password: 'Student123!', full_name: 'Demo Student', role: 'student' },
  { email: 'teacher@overcomersuniversity.com', password: 'Teacher123!', full_name: 'Demo Teacher', role: 'teacher' },
  { email: 'admin@overcomersuniversity.com', password: 'Admin123!', full_name: 'Prophet Joshua Matthews', role: 'super_admin' },
]

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Demo seeding is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local with real Supabase values (not placeholders).',
      },
      { status: 500 }
    )
  }

  const results = []

  for (const account of DEMO_ACCOUNTS) {
    // Check if user already exists by listing users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      results.push({ email: account.email, status: 'error', error: listError.message })
      continue
    }
    const existing = existingUsers?.users?.find((u) => u.email === account.email)

    if (existing) {
      // Make sure profile has correct role
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: existing.id,
        full_name: account.full_name,
        role: account.role,
        email: account.email,
      })
      if (profileError) {
        results.push({ email: account.email, status: 'error', error: profileError.message })
      } else {
        results.push({ email: account.email, status: 'exists', role: account.role })
      }
      continue
    }

    // Create user
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.full_name },
    })

    if (error) {
      results.push({ email: account.email, status: 'error', error: error.message })
      continue
    }

    if (newUser?.user) {
      // Create profile with the right role
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        full_name: account.full_name,
        role: account.role,
        email: account.email,
      })
      if (profileError) {
        results.push({ email: account.email, status: 'error', error: profileError.message })
      } else {
        results.push({ email: account.email, status: 'created', role: account.role })
      }
    }
  }

  const allOk = results.every((r: any) => r.status === 'created' || r.status === 'exists')
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 500 })
}
