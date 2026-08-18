import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const SITE_URL = 'https://ognuniversity.com'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Create user via Admin API, already confirmed so they can sign in
    // immediately with their password. Email verification is tracked
    // app-side via user_metadata.email_verified and the dashboard banner.
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || '', email_verified: false },
      }),
    })

    const createData = await createRes.json()

    if (!createRes.ok) {
      // Check if user already exists
      if (createData?.msg?.includes('already') || createData?.message?.includes('already')) {
        return NextResponse.json({ error: 'An account with this email already exists.', code: 'user_exists' }, { status: 409 })
      }
      console.error('Create user failed:', createData)
      return NextResponse.json({ error: createData.msg || createData.message || 'Failed to create account' }, { status: 500 })
    }

    // Generate a verification link (magiclink works for confirmed users;
    // clicking it signs them in and marks email_verified via /auth/confirm)
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
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

    let confirmLink = `${SITE_URL}`

    if (linkRes.ok) {
      const linkData = await linkRes.json()
      if (linkData.action_link) {
        // Extract token from Supabase's action link and build our own
        try {
          const url = new URL(linkData.action_link)
          const token = url.searchParams.get('token')
          const type = url.searchParams.get('type') || 'magiclink'
          confirmLink = `${SITE_URL}/auth/confirm?token_hash=${token}&type=${type}`
        } catch {
          confirmLink = `${SITE_URL}`
        }
      }
    }

    // Send branded verification email via SendGrid (NOT Supabase's email)
    const emailSent = await sendEmail({
      to: email,
      toName: name,
      subject: 'Verify Your OGN University Account',
      htmlBody: `<h2>Welcome to OGN University, ${name || 'Student'}!</h2>
        <p>We're honored to have you join the OGN University family. Your journey in studying the things of God begins now.</p>
        <p><strong>Click the button below to verify your email:</strong></p>
        <a href="${confirmLink}" class="btn">Verify My Email</a>
        <p style="margin-top:25px">You already have full access to:</p>
        <ul>
          <li>Comprehensive theological courses</li>
          <li>Interactive lessons and quizzes</li>
          <li>Direct messaging with instructors</li>
          <li>Community discussions and fellowship</li>
        </ul>
        <p style="margin-top:20px">May the Lord bless your studies,<br><strong class="gold">Prophet Joshua T. Matthews<br>OGN University</strong></p>
        <p style="font-size:12px;color:#999;margin-top:20px">Having trouble with the button? Copy and paste this link:<br><span style="word-break:break-all;color:#0B1C3D">${confirmLink}</span></p>`,
      templateType: 'verification',
      metadata: { email, name },
    })

    // Notify admin of new signup (non-blocking)
    try {
      const adminEmail = 'prophetjoshuamatthews@gmail.com'
      await sendEmail({
        to: adminEmail,
        subject: `New Student Signup: ${name || email}`,
        htmlBody: `<h2>New Student Registration</h2>
          <p><strong>${name || 'Unknown'}</strong> (${email}) has signed up for OGN University.</p>
          <a href="${SITE_URL}/admin" class="btn">View Admin Panel</a>`,
        templateType: 'admin_notification',
        metadata: { email, name },
      })
    } catch {}

    return NextResponse.json({ success: true, emailSent, message: 'Account created!' })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 })
  }
}
