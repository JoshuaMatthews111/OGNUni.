import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ognuniversity.com'

// Fix the redirect_to parameter inside Supabase action links to point to our live site
function fixActionLink(link: string): string {
  if (!link) return link
  try {
    const url = new URL(link)
    // The action link is on Supabase's domain (correct), but the redirect_to inside it points to localhost
    // Fix the redirect_to param to point to our live site callback
    const redirectTo = url.searchParams.get('redirect_to')
    if (redirectTo && (redirectTo.includes('localhost') || redirectTo.includes('127.0.0.1'))) {
      url.searchParams.set('redirect_to', `${SITE_URL}/auth/callback`)
    } else if (!redirectTo) {
      url.searchParams.set('redirect_to', `${SITE_URL}/auth/callback`)
    }
    return url.toString()
  } catch {
    // If URL parsing fails, do string replacement on redirect_to
    return link
      .replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(SITE_URL + '/auth/callback')}`)
      .replace('redirect_to=http://localhost:3000', `redirect_to=${SITE_URL}/auth/callback`)
  }
}

export async function POST(request: Request) {
  try {
    const { email, type, name, redirectUrl } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const callbackUrl = `${SITE_URL}/auth/callback`

    if (type === 'magic_link') {
      // Generate magic link via Supabase Admin API
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
            redirectTo: callbackUrl,
          },
        }),
      })

      if (!linkRes.ok) {
        const errBody = await linkRes.text()
        console.error('Generate magic link failed:', errBody)
        return NextResponse.json({ error: 'Failed to generate login link. Please try password login.' }, { status: 500 })
      }

      const linkData = await linkRes.json()
      const actionLink = fixActionLink(linkData.action_link)

      if (!actionLink) {
        return NextResponse.json({ error: 'No link generated' }, { status: 500 })
      }

      // Send via SendGrid with full branding
      await sendEmail({
        to: email,
        subject: 'Your OGN University Login Link',
        htmlBody: `<h2>Sign in to OGN University</h2>
          <p>You requested a secure login link. Click the button below to sign in instantly — no password needed.</p>
          <a href="${actionLink}" class="btn">Sign In to My Account</a>
          <p style="margin-top:25px;font-size:13px;color:#555">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="font-size:12px;color:#999;margin-top:15px">Having trouble? Copy and paste this link into your browser:<br><span style="word-break:break-all;color:#0B1C3D">${actionLink}</span></p>`,
        templateType: 'magic_link',
        metadata: { email },
      })

      return NextResponse.json({ success: true, message: 'Login link sent to your email' })

    } else if (type === 'signup_verification') {
      // Try multiple link types to get a working verification link
      const linkTypes = ['signup', 'invite', 'magiclink']
      let actionLink: string | null = null

      for (const linkType of linkTypes) {
        const body: any = {
          type: linkType,
          email,
          options: {
            redirectTo: callbackUrl,
            data: { full_name: name || '' },
          },
        }

        const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(body),
        })

        if (linkRes.ok) {
          const data = await linkRes.json()
          if (data.action_link) {
            actionLink = fixActionLink(data.action_link)
            break
          }
        }
      }

      if (!actionLink) {
        // Last resort: send welcome email without verify link (user can still sign in with password)
        await sendEmail({
          to: email,
          toName: name,
          subject: 'Welcome to OGN University!',
          htmlBody: `<h2>Welcome, ${name || 'Student'}!</h2>
            <p>Your account has been created at OGN University! You can now sign in with your email and password.</p>
            <a href="${SITE_URL}" class="btn">Go to OGN University</a>
            <p>May the Lord bless your studies,<br><strong class="gold">OGN University Team</strong></p>`,
          templateType: 'welcome_fallback',
          metadata: { email, name },
        })
        return NextResponse.json({ success: true, message: 'Welcome email sent' })
      }

      // Send branded verification email via SendGrid
      await sendEmail({
        to: email,
        toName: name,
        subject: 'Verify Your OGN University Account',
        htmlBody: `<h2>Welcome to OGN University, ${name || 'Student'}!</h2>
          <p>We're honored to have you join the OGN University family. Your journey in studying the things of God begins now.</p>
          <p><strong>Click the button below to verify your email and activate your account:</strong></p>
          <a href="${actionLink}" class="btn">Verify My Account & Get Started</a>
          <p style="margin-top:25px">Once verified, you'll have instant access to:</p>
          <ul>
            <li>📖 Comprehensive theological courses</li>
            <li>✍️ Interactive lessons and quizzes</li>
            <li>💬 Direct messaging with instructors</li>
            <li>🤝 Community discussions and fellowship</li>
          </ul>
          <p style="margin-top:20px">May the Lord bless your studies,<br><strong class="gold">Prophet Joshua T. Matthews<br>OGN University</strong></p>
          <p style="font-size:12px;color:#999;margin-top:20px">Having trouble with the button? Copy and paste this link:<br><span style="word-break:break-all;color:#0B1C3D">${actionLink}</span></p>`,
        templateType: 'verification',
        metadata: { email, name },
      })

      return NextResponse.json({ success: true, message: 'Verification email sent' })
    }

    return NextResponse.json({ error: 'Invalid type. Use magic_link or signup_verification' }, { status: 400 })
  } catch (error: any) {
    console.error('Auth email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
