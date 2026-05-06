import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH: Update user role or status
export async function PATCH(request: Request) {
  try {
    const { userId, action, role, password } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (action === 'change_role' && role) {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Role updated' })
    }

    if (action === 'suspend') {
      // Set is_active to false and ban user in auth
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)
      if (profileError) throw profileError

      // Ban user in Supabase Auth
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ ban_duration: '876000h' }), // ~100 years
      })

      return NextResponse.json({ success: true, message: 'User suspended' })
    }

    if (action === 'pause') {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'User paused' })
    }

    if (action === 'activate') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', userId)
      if (profileError) throw profileError

      // Unban user in Supabase Auth
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ ban_duration: 'none' }),
      })

      return NextResponse.json({ success: true, message: 'User activated' })
    }

    if (action === 'change_password') {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
      }
      return NextResponse.json({ success: true, message: 'Password changed successfully' })
    }

    if (action === 'delete') {
      // Delete from auth (cascades to profile if configured)
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      })
      if (!res.ok) {
        // Fallback: just mark inactive
        await supabase.from('profiles').update({ is_active: false, status: 'deleted' }).eq('id', userId)
      }
      return NextResponse.json({ success: true, message: 'User deleted' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
