import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    const message = encodeURIComponent(errorDescription || error || 'Login failed')
    return NextResponse.redirect(requestUrl.origin + `/?auth_error=${message}`)
  }

  const supabase = await createClient()
  let authenticated = false

  // Handle PKCE code exchange (magic link, OAuth)
  if (code) {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    if (sessionError) {
      const message = encodeURIComponent(sessionError.message)
      return NextResponse.redirect(requestUrl.origin + `/?auth_error=${message}`)
    }
    authenticated = true
  }

  // Handle token_hash verification (email verification, magic link with token)
  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    })
    if (verifyError) {
      const message = encodeURIComponent(verifyError.message)
      return NextResponse.redirect(requestUrl.origin + `/?auth_error=${message}`)
    }
    authenticated = true
  }

  if (authenticated) {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if profile exists
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

      if (!profile) {
        // First-time user — create profile
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User'
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'student',
          is_active: true,
        })
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
