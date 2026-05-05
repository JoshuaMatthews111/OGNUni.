import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { ROLE_LABELS } from '@/lib/constants'

const SITE_URL = 'https://ognuniversity.com'

export async function POST(request: Request) {
  try {
    const { email, role, name } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Generate an invite link via Supabase Admin API
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type: 'invite',
        email,
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          data: { full_name: name || '', assigned_role: role },
        },
      }),
    })

    let confirmLink = SITE_URL
    if (linkRes.ok) {
      const linkData = await linkRes.json()
      if (linkData.action_link) {
        try {
          const url = new URL(linkData.action_link)
          const token = url.searchParams.get('token')
          const type = url.searchParams.get('type') || 'invite'
          confirmLink = `${SITE_URL}/auth/confirm?token_hash=${token}&type=${type}`
        } catch {}
      }

      // If user was created by invite, update their metadata to include assigned_role
      if (linkData.id) {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${linkData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_metadata: { full_name: name || '', assigned_role: role },
          }),
        })
      }
    } else {
      // User might already exist - try magiclink instead
      const fallbackRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${SITE_URL}/auth/callback`,
          },
        }),
      })
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        if (fallbackData.action_link) {
          try {
            const url = new URL(fallbackData.action_link)
            const token = url.searchParams.get('token')
            const type = url.searchParams.get('type') || 'magiclink'
            confirmLink = `${SITE_URL}/auth/confirm?token_hash=${token}&type=${type}`
          } catch {}
        }
      }
    }

    const roleLabel = ROLE_LABELS[role] || role

    // Send branded invitation email
    await sendEmail({
      to: email,
      toName: name,
      subject: `You're Invited to OGN University as ${roleLabel}`,
      htmlBody: `<h2>You've Been Invited!</h2>
        <p>Prophet Joshua T. Matthews has personally invited you to join <strong>OGN University</strong> as a <strong class="gold">${roleLabel}</strong>.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
        <a href="${confirmLink}" class="btn">Accept Invitation</a>
        <p style="margin-top:20px">As ${roleLabel === 'Student' ? 'a Student' : `a ${roleLabel}`}, you'll have access to:</p>
        <ul>
          ${role === 'super_admin' ? '<li>Full system management and oversight</li><li>User management and permissions</li><li>Revenue and payment tracking</li>' : ''}
          ${role === 'prophet' ? '<li>Course creation and publishing</li><li>Quiz and certificate management</li><li>Community moderation</li>' : ''}
          ${role === 'teacher' ? '<li>Teaching assigned courses</li><li>Quiz review and grading</li><li>Discussion facilitation</li>' : ''}
          ${role === 'minister' ? '<li>Student mentoring and support</li><li>Community engagement</li><li>Discussion moderation</li>' : ''}
          ${role === 'student' ? '<li>Course enrollment and learning</li><li>Quizzes and certificates</li><li>Community access</li>' : ''}
        </ul>
        <p style="margin-top:20px">We look forward to having you serve with us.<br><strong class="gold">OGN University</strong></p>`,
      templateType: 'invitation',
      metadata: { email, role, name },
    })

    return NextResponse.json({ success: true, message: `Invitation sent to ${email}`, link: confirmLink })
  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 })
  }
}
