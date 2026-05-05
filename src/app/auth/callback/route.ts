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
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}
