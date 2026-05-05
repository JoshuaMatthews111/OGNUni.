import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email, type, name, redirectUrl } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use Supabase Admin API to generate the magic link / OTP link
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const baseRedirect = redirectUrl || `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

    if (type === 'magic_link') {
      // Generate magic link via Supabase Admin API
      const res = await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          email,
          data: {},
          code_challenge: null,
          code_challenge_method: null,
        }),
      })

      if (!res.ok) {
        // Fallback: use generate_link admin endpoint
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
              redirectTo: baseRedirect,
            },
          }),
        })

        if (!linkRes.ok) {
          const errBody = await linkRes.text()
          console.error('Generate link failed:', errBody)
          return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
        }

        const linkData = await linkRes.json()
        const actionLink = linkData.action_link

        if (actionLink) {
          // Send the magic link via SendGrid
          await sendEmail({
            to: email,
            subject: 'Your OGN University Login Link',
            htmlBody: `<h2>Sign in to OGN University</h2>
              <p>Click the button below to securely sign in to your account. This link expires in 1 hour.</p>
              <a href="${actionLink}" class="btn">Sign In Now</a>
              <p style="margin-top:20px;font-size:12px;color:#666">If you didn't request this, you can safely ignore this email.</p>`,
            templateType: 'magic_link',
            metadata: { email },
          })

          return NextResponse.json({ success: true, message: 'Login link sent' })
        }
      }

      // If the first magiclink call succeeded, Supabase sent it via SMTP
      return NextResponse.json({ success: true, message: 'Login link sent' })

    } else if (type === 'signup_verification') {
      // Generate signup confirmation link
      const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'signup',
          email,
          password: '', // not needed for link generation on existing user
          options: {
            redirectTo: baseRedirect,
            data: { full_name: name || '' },
          },
        }),
      })

      if (!linkRes.ok) {
        // Try invite link as fallback
        const inviteRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
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
              redirectTo: baseRedirect,
              data: { full_name: name || '' },
            },
          }),
        })

        if (!inviteRes.ok) {
          console.error('Generate verification link failed')
          // Send welcome email without verification link as last resort
          await sendEmail({
            to: email,
            toName: name,
            subject: 'Welcome to OGN University!',
            htmlBody: `<h2>Welcome, ${name || 'Student'}!</h2>
              <p>Your account has been created successfully! You can now sign in to OGN University.</p>
              <a href="${baseRedirect.replace('/auth/callback', '/dashboard')}" class="btn">Go to Dashboard</a>
              <p>May the Lord bless your studies,<br><strong class="gold">OGN University Team</strong></p>`,
            templateType: 'welcome',
            metadata: { email, name },
          })
          return NextResponse.json({ success: true, message: 'Welcome email sent' })
        }

        const invData = await inviteRes.json()
        const verifyLink = invData.action_link

        if (verifyLink) {
          await sendEmail({
            to: email,
            toName: name,
            subject: 'Verify Your OGN University Account',
            htmlBody: `<h2>Welcome, ${name || 'Student'}!</h2>
              <p>We're honored to have you join the OGN University family. Your journey begins now.</p>
              <p>Click the button below to verify your email and activate your account:</p>
              <a href="${verifyLink}" class="btn">Verify My Account</a>
              <p style="margin-top:20px">Once verified, you'll have access to:</p>
              <ul>
                <li>Comprehensive theological courses</li>
                <li>Interactive lessons and quizzes</li>
                <li>Direct messaging with instructors</li>
                <li>Community discussions</li>
              </ul>
              <p>May the Lord bless your studies,<br><strong class="gold">OGN University Team</strong></p>`,
            templateType: 'verification',
            metadata: { email, name },
          })
          return NextResponse.json({ success: true, message: 'Verification email sent' })
        }
      }

      const linkData = await linkRes.json()
      const verifyLink = linkData.action_link

      if (verifyLink) {
        await sendEmail({
          to: email,
          toName: name,
          subject: 'Verify Your OGN University Account',
          htmlBody: `<h2>Welcome, ${name || 'Student'}!</h2>
            <p>We're honored to have you join the OGN University family. Your journey begins now.</p>
            <p>Click the button below to verify your email and activate your account:</p>
            <a href="${verifyLink}" class="btn">Verify My Account</a>
            <p style="margin-top:20px">Once verified, you'll have access to:</p>
            <ul>
              <li>Comprehensive theological courses</li>
              <li>Interactive lessons and quizzes</li>
              <li>Direct messaging with instructors</li>
              <li>Community discussions</li>
            </ul>
            <p>May the Lord bless your studies,<br><strong class="gold">OGN University Team</strong></p>`,
          templateType: 'verification',
          metadata: { email, name },
        })

        return NextResponse.json({ success: true, message: 'Verification email sent' })
      }

      return NextResponse.json({ error: 'Could not generate verification link' }, { status: 500 })
    }

    return NextResponse.json({ error: 'Invalid type. Use magic_link or signup_verification' }, { status: 400 })
  } catch (error: any) {
    console.error('Auth email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
