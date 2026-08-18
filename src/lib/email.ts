const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
// Verified sender in SendGrid
const FROM_EMAIL = 'ognuniversity@overcomersglobalnetwork.com'
const FROM_NAME = 'OGN University'
export const ADMIN_EMAIL = 'prophetjoshuamatthews@gmail.com'

const LOGO_URL = 'https://ognuniversity.com/assets/ogn-logo-small.png'

// HTML email wrapper with OGN branding
function wrapInTemplate(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f4f4f4;font-family:Georgia,'Times New Roman',serif}
  .container{max-width:600px;margin:0 auto;background:#fff}
  .header{background:#0B1C3D;padding:30px;text-align:center}
  .header h1{color:#C9A24A;margin:0;font-size:22px;letter-spacing:2px}
  .header p{color:rgba(255,255,255,0.7);font-size:11px;margin:5px 0 0;letter-spacing:1px}
  .body{padding:30px;color:#333;line-height:1.6}
  .body h2{color:#0B1C3D;margin-top:0}
  .btn{display:inline-block;background:#C9A24A;color:#0B1C3D;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;margin:15px 0}
  .footer{background:#0B1C3D;padding:25px;text-align:center}
  .footer p{color:rgba(255,255,255,0.6);font-size:11px;margin:5px 0}
  .footer .motto{color:#C9A24A;font-size:13px;font-style:italic;margin:10px 0}
  .gold{color:#C9A24A}
</style></head>
<body><div class="container">
  <div class="header">
    <img src="${LOGO_URL}" alt="OGN University" width="80" height="80" style="display:block;margin:0 auto 12px;border-radius:50%">
    <h1>OGN UNIVERSITY</h1>
    <p>OVERCOMERS GLOBAL NETWORK</p>
  </div>
  <div class="body">
    ${body}
  </div>
  <div class="footer">
    <p class="motto">"Educate, Equip, and Evolve all men to the fullness of Christ Jesus"</p>
    <p style="color:#C9A24A;font-weight:bold">OGN UNIVERSITY</p>
    <p>Overcomers Global Network</p>
    <p style="margin-top:10px">&copy; ${new Date().getFullYear()} OGN University. All rights reserved.</p>
  </div>
</div></body></html>`
}

function plainTextFallback(body: string): string {
  return body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    + '\n\n---\nOGN UNIVERSITY | Overcomers Global Network\n"Educate, Equip, and Evolve all men to the fullness of Christ Jesus"\n'
}

export interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  htmlBody: string
  templateType?: string
  metadata?: Record<string, any>
}

export async function sendEmail({ to, toName, subject, htmlBody, templateType, metadata }: SendEmailParams): Promise<boolean> {
  const html = wrapInTemplate(htmlBody, subject)
  const text = plainTextFallback(htmlBody)

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to, name: toName || '' }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    })

    let success = res.status >= 200 && res.status < 300
    let provider = 'sendgrid'

    // SendGrid failed (e.g. out of credits) — fall back to FormSubmit
    if (!success) {
      const { sendViaFormSubmit } = await import('./formsubmit')
      const fallbackOk = await sendViaFormSubmit({ toEmail: to, toName, subject, message: text })
      if (fallbackOk) {
        success = true
        provider = 'formsubmit'
      }
    }
    metadata = { ...(metadata || {}), provider }

    // Log to database (server-side only, don't crash if logging fails)
    try {
      const { createClient: createServerClient } = await import('@supabase/supabase-js')
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.from('email_logs').insert({
        to_email: to,
        to_name: toName,
        subject,
        template_type: templateType || 'general',
        status: success ? 'sent' : 'failed',
        error_message: success ? null : `HTTP ${res.status}`,
        metadata: metadata || {},
      })
    } catch {}

    return success
  } catch (error: any) {
    console.error('Email send failed:', error.message)
    // Log failure but don't crash
    try {
      const { createClient: createServerClient } = await import('@supabase/supabase-js')
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.from('email_logs').insert({
        to_email: to, subject,
        template_type: templateType || 'general',
        status: 'error', error_message: error.message,
      })
    } catch {}
    return false
  }
}

// Pre-built email templates
export const emailTemplates = {
  welcomeStudent: (name: string) => ({
    subject: 'Welcome to OGN University!',
    htmlBody: `<h2>Welcome, ${name}!</h2>
      <p>We're honored to have you join the OGN University family. Your journey in studying the things of God begins now.</p>
      <p>As a student, you have access to:</p>
      <ul>
        <li>Comprehensive theological courses</li>
        <li>Interactive lessons and quizzes</li>
        <li>Direct messaging with instructors</li>
        <li>Community discussions</li>
      </ul>
      <a href="https://ognuniversity.com/dashboard" class="btn">Go to Your Dashboard</a>
      <p>May the Lord bless your studies,<br><strong class="gold">OGN University Team</strong></p>`,
  }),

  newEnrollment: (studentName: string, courseName: string) => ({
    subject: `New Enrollment: ${studentName} joined "${courseName}"`,
    htmlBody: `<h2>New Course Enrollment</h2>
      <p><strong>${studentName}</strong> has enrolled in <strong class="gold">${courseName}</strong>.</p>
      <a href="https://ognuniversity.com/admin/enrollments" class="btn">View Enrollments</a>`,
  }),

  enrollmentConfirmation: (studentName: string, courseName: string) => ({
    subject: `You're enrolled in "${courseName}"!`,
    htmlBody: `<h2>Enrollment Confirmed!</h2>
      <p>Congratulations, ${studentName}! You are now enrolled in <strong class="gold">${courseName}</strong>.</p>
      <p>Start your learning journey today:</p>
      <a href="https://ognuniversity.com/courses" class="btn">Start Learning</a>`,
  }),

  newMessage: (senderName: string, preview: string) => ({
    subject: `New message from ${senderName}`,
    htmlBody: `<h2>New Message</h2>
      <p><strong>${senderName}</strong> sent you a message:</p>
      <blockquote style="border-left:3px solid #C9A24A;padding:10px 15px;background:#f9f7f1;margin:15px 0;font-style:italic">${preview.substring(0, 200)}...</blockquote>
      <a href="https://ognuniversity.com/messages" class="btn">Read Full Message</a>`,
  }),

  coursePublished: (courseName: string, teacherName: string) => ({
    subject: `Course Published: "${courseName}"`,
    htmlBody: `<h2>New Course Published</h2>
      <p><strong>${teacherName}</strong> has published a new course: <strong class="gold">${courseName}</strong>.</p>
      <a href="https://ognuniversity.com/admin/courses" class="btn">Review Course</a>`,
  }),

  assignmentSubmitted: (studentName: string, lessonName: string, courseName: string) => ({
    subject: `Assignment Submitted: ${lessonName}`,
    htmlBody: `<h2>Assignment Submission</h2>
      <p><strong>${studentName}</strong> has submitted work for <strong class="gold">${lessonName}</strong> in ${courseName}.</p>
      <a href="https://ognuniversity.com/admin" class="btn">Review Submission</a>`,
  }),

  adminNotification: (eventType: string, details: string) => ({
    subject: `[Admin] ${eventType}`,
    htmlBody: `<h2>${eventType}</h2><p>${details}</p>
      <a href="https://ognuniversity.com/admin" class="btn">Go to Admin Panel</a>`,
  }),
}

// ADMIN_EMAIL is exported at top of file
