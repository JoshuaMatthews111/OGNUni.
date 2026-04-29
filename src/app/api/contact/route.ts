import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Store contact submission in database (optional - you'd need to create a contacts table)
    // For now, we'll just log it and return success
    console.log('Contact form submission:', { name, email, message })

    // In production, you would:
    // 1. Store in database
    // 2. Send email notification to admin
    // 3. Send confirmation email to user

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    )
  }
}
