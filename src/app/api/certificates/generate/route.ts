import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { enrollmentId } = await request.json()

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID required' }, { status: 400 })
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        *,
        user:user_id(id, full_name, email),
        course:course_id(id, title)
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const certificateNumber = `OGNU-${Date.now()}-${enrollment.user.id.slice(0, 8).toUpperCase()}`

    const { data: existingCert } = await supabase
      .from('certificates')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .single()

    if (existingCert) {
      return NextResponse.json({ 
        message: 'Certificate already exists',
        certificateId: existingCert.id 
      })
    }

    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Georgia', serif; margin: 0; padding: 40px; background: #0a1628; }
          .certificate {
            background: white; padding: 60px 50px; max-width: 850px; margin: 0 auto;
            border: 8px solid #c9a227; box-shadow: 0 0 0 4px #0a1628, 0 0 0 12px #c9a227;
            position: relative;
          }
          .corner { position: absolute; width: 40px; height: 40px; border: 3px solid #c9a227; }
          .tl { top: 15px; left: 15px; border-right: none; border-bottom: none; }
          .tr { top: 15px; right: 15px; border-left: none; border-bottom: none; }
          .bl { bottom: 15px; left: 15px; border-right: none; border-top: none; }
          .br { bottom: 15px; right: 15px; border-left: none; border-top: none; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 14px; letter-spacing: 4px; color: #c9a227; font-weight: bold; margin-bottom: 5px; }
          .org { font-size: 11px; letter-spacing: 3px; color: #0a1628; }
          .title { font-size: 42px; color: #0a1628; margin: 25px 0 10px; font-weight: bold; }
          .subtitle { font-size: 16px; color: #6b7280; margin-bottom: 30px; }
          .recipient { text-align: center; margin: 30px 0; }
          .name {
            font-size: 34px; color: #0a1628; font-weight: bold; margin: 15px 0;
            border-bottom: 3px solid #c9a227; display: inline-block; padding: 10px 50px;
          }
          .course { text-align: center; font-size: 18px; color: #4b5563; margin: 25px 0; }
          .course strong { color: #0a1628; font-size: 22px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature { text-align: center; flex: 1; }
          .signature-line { border-top: 2px solid #0a1628; width: 180px; margin: 0 auto 8px; }
          .sig-name { font-size: 14px; font-weight: bold; color: #0a1628; }
          .sig-title { font-size: 11px; color: #6b7280; }
          .cert-number { text-align: center; margin-top: 30px; font-size: 11px; color: #9ca3af; letter-spacing: 1px; }
          .tagline { text-align: center; margin-top: 15px; font-size: 12px; color: #c9a227; font-weight: bold; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="corner tl"></div><div class="corner tr"></div>
          <div class="corner bl"></div><div class="corner br"></div>
          <div class="header">
            <div class="logo">OGN UNIVERSITY</div>
            <div class="org">OVERCOMERS GLOBAL NETWORK</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This is to certify that</div>
          </div>
          <div class="recipient">
            <div class="name">${enrollment.user.full_name || 'Student'}</div>
          </div>
          <div class="course">
            has successfully completed the course<br/><br/>
            <strong>${enrollment.course.title}</strong>
          </div>
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <div class="sig-name">Prophet Joshua Matthews</div>
              <div class="sig-title">President & Founder</div>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <div class="sig-name">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div class="sig-title">Date of Completion</div>
            </div>
          </div>
          <div class="cert-number">Certificate #: ${certificateNumber}</div>
          <div class="tagline">EDUCATE • EQUIP • EVOLVE</div>
        </div>
      </body>
      </html>
    `

    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert({
        enrollment_id: enrollmentId,
        user_id: enrollment.user.id,
        course_id: enrollment.course.id,
        certificate_number: certificateNumber,
        pdf_url: null,
      })
      .select()
      .single()

    if (certError) {
      return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 })
    }

    await supabase
      .from('enrollments')
      .update({ certificate_issued_at: new Date().toISOString() })
      .eq('id', enrollmentId)

    return NextResponse.json({
      success: true,
      certificateId: certificate.id,
      certificateNumber,
      html: certificateHTML
    })

  } catch (error) {
    console.error('Certificate generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
