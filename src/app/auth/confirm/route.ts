import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// This route handles email verification and magic link tokens directly
// Instead of relying on Supabase's /auth/v1/verify (which redirects to localhost),
// we verify the token ourselves and redirect to the correct page
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash') || requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')

  if (!tokenHash || !type) {
    return NextResponse.redirect(requestUrl.origin + '/?auth_error=Invalid+verification+link')
  }

  const supabase = await createClient()

  // Verify the OTP token
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as any,
  })

  if (error) {
    console.error('Verify OTP error:', error.message)
    return NextResponse.redirect(requestUrl.origin + `/?auth_error=${encodeURIComponent(error.message)}`)
  }

  // If this is a password recovery, redirect to reset-password page
  if (type === 'recovery') {
    return NextResponse.redirect(requestUrl.origin + '/auth/reset-password')
  }

  // Clicking any emailed link proves ownership of the inbox — mark verified
  try {
    await supabase.auth.updateUser({ data: { email_verified: true } })
  } catch {}

  // User is now authenticated - check/create profile
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (!profile) {
      // First-time user — create profile
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User'
      const assignedRole = user.user_metadata?.assigned_role || 'student'
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: assignedRole,
        is_active: true,
      })
      // Redirect based on assigned role
      if (['super_admin', 'prophet', 'teacher', 'minister'].includes(assignedRole)) {
        return NextResponse.redirect(requestUrl.origin + '/admin')
      }
      return NextResponse.redirect(requestUrl.origin + '/dashboard')
    }

    // Role-based redirect
    if (['super_admin', 'prophet', 'teacher', 'minister'].includes(profile.role)) {
      return NextResponse.redirect(requestUrl.origin + '/admin')
    }
  }

  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}
