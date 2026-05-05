import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors (e.g. provider not enabled)
  if (error) {
    const message = encodeURIComponent(errorDescription || error || 'Login failed')
    return NextResponse.redirect(requestUrl.origin + `/?auth_error=${message}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    if (sessionError) {
      const message = encodeURIComponent(sessionError.message)
      return NextResponse.redirect(requestUrl.origin + `/?auth_error=${message}`)
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if profile exists
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

      if (!profile) {
        // First-time user (magic link signup) — create profile
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User'
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'student',
          is_active: true,
        })

        // Send welcome email (non-blocking)
        try {
          await fetch(`${requestUrl.origin}/api/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: 'new_signup',
              data: { name: fullName, email: user.email },
            }),
          })
        } catch {}
      }

      // Role-based redirect
      if (profile && ['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)) {
        return NextResponse.redirect(requestUrl.origin + '/admin')
      }
    }
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}
